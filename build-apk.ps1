$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$root = (Get-Location).Path
$desktop = [Environment]::GetFolderPath("Desktop")

# 1. Auto-Increment Patch Version & Android Build Code across ONLY the exact 5 version files
$pkgPath = Join-Path $root "package.json"
$pkgJson = ([System.IO.File]::ReadAllText($pkgPath, $utf8)) | ConvertFrom-Json
$oldVer = [string]$pkgJson.version
$parts = $oldVer.Split(".")
$newVer = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)"

$appGradlePath = Join-Path $root "android\app\build.gradle"
$agText = [System.IO.File]::ReadAllText($appGradlePath, $utf8)
$oldBuild = [int]([regex]::Match($agText, 'versionCode\s+(\d+)').Groups[1].Value)
$newBuild = $oldBuild + 1

Write-Host "`n[1/5] Bumping WE4ALL Version: v$oldVer (build $oldBuild) -> v$newVer (build $newBuild)" -ForegroundColor Cyan

$exactFiles = @(
    $pkgPath,
    (Join-Path $root "package-lock.json"),
    $appGradlePath,
    (Join-Path $root "src\appVersion.js"),
    (Join-Path $root "src\version.js"),
    (Join-Path $root "src\supabaseClient.js"),
    (Join-Path $root "tests\installedAppVersion.test.js")
)

foreach ($fullPath in $exactFiles) {
    if (Test-Path $fullPath) {
        $c = [System.IO.File]::ReadAllText($fullPath, $utf8)
        $u = [regex]::Replace($c, '3\.3\.\d+', $newVer)
        $u = [regex]::Replace($u, "(APP_BUILD_NUMBER\s*=\s*)\d+", "`${1}$newBuild")
        $u = [regex]::Replace($u, "(versionCode\s+)\d+", "`${1}$newBuild")
        if ($c -ne $u) {
            [System.IO.File]::WriteAllText($fullPath, $u, $utf8)
        }
    }
}

# 2. Run All 176 Unit Tests & Build Production Bundle
Write-Host "[2/5] Running 176 Unit Tests & Vite Production Build..." -ForegroundColor Cyan
npm test
npm run build
npx cap sync android

# 3. Compile Native Android Mobile APK Outside OneDrive
Write-Host "[3/5] Compiling Native Android Mobile APK (WE4ALL-SuperApp-v$newVer.apk)..." -ForegroundColor Cyan
$localAndroidBuild = Join-Path $env:LOCALAPPDATA "we4all-android-workspace"
robocopy (Join-Path $root "android") (Join-Path $localAndroidBuild "android") /MIR /NFL /NDL /NJH /NJS /NP /XD build .gradle | Out-Null
robocopy (Join-Path $root "node_modules\@capacitor") (Join-Path $localAndroidBuild "node_modules\@capacitor") /MIR /NFL /NDL /NJH /NJS /NP /XD build | Out-Null
robocopy (Join-Path $root "node_modules\@aparajita") (Join-Path $localAndroidBuild "node_modules\@aparajita") /MIR /NFL /NDL /NJH /NJS /NP /XD build | Out-Null
robocopy (Join-Path $root "node_modules\@capgo") (Join-Path $localAndroidBuild "node_modules\@capgo") /MIR /NFL /NDL /NJH /NJS /NP /XD build | Out-Null

Push-Location (Join-Path $localAndroidBuild "android")
.\gradlew.bat --no-daemon assembleDebug
Pop-Location

$apkOut = Join-Path $localAndroidBuild "android\app\build\outputs\apk\debug\app-debug.apk"
$apkFileName = "WE4ALL-SuperApp-v$newVer.apk"
if (Test-Path $apkOut) {
    Remove-Item -Path (Join-Path $root "WE4ALL*.apk") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $desktop "WE4ALL*.apk") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $root "dist\WE4ALL*.apk") -Force -ErrorAction SilentlyContinue

    # Keep versioned APK on Desktop and dist/WE4ALL.apk only
    Copy-Item $apkOut (Join-Path $desktop $apkFileName) -Force
    Copy-Item $apkOut (Join-Path $root "dist\$apkFileName") -Force
    Copy-Item $apkOut (Join-Path $root "dist\WE4ALL.apk") -Force
}

# 4. Build Native Windows Setup Installer (.exe) with T&C License Wizard (NSIS)
Write-Host "[4/5] Building Windows Setup Installer with T&C Approval Wizard (WE4ALL-SuperApp-Setup-v$newVer.exe)..." -ForegroundColor Cyan
$winWorkspace = Join-Path $env:LOCALAPPDATA "we4all-windows-installer"
if (-not (Test-Path $winWorkspace)) { New-Item -ItemType Directory -Path $winWorkspace | Out-Null }

robocopy (Join-Path $root "dist") (Join-Path $winWorkspace "dist") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
robocopy (Join-Path $root "electron") (Join-Path $winWorkspace "electron") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
Remove-Item -Path (Join-Path $winWorkspace "dist\WE4ALL*.apk") -Force -ErrorAction SilentlyContinue

$winIndexFile = Join-Path $winWorkspace "dist\index.html"
if (Test-Path $winIndexFile) {
    $idxHtml = [System.IO.File]::ReadAllText($winIndexFile, $utf8)
    $idxHtml = $idxHtml.Replace('src="/assets/', 'src="./assets/').Replace('href="/assets/', 'href="./assets/')
    [System.IO.File]::WriteAllText($winIndexFile, $idxHtml, $utf8)
}

$builderPkg = @{
    name = "we4all-superapp-windows"
    productName = "WE4ALL Super-App"
    version = $newVer
    description = "WE4ALL VocalForLocal 6-Portal Super-App for Windows Desktop"
    author = "Khoday Anvesh (WE4ALL)"
    main = "electron/main.cjs"
    build = @{
        appId = "com.we4all.superapp.desktop"
        productName = "WE4ALL Super-App"
        files = @("dist/**/*", "electron/**/*", "package.json")
        win = @{
            target = @(
                @{ target = "nsis"; arch = @("x64") }
            )
        }
        nsis = @{
            oneClick = $false
            perMachine = $false
            allowToChangeInstallationDirectory = $true
            license = "electron/LICENSE.txt"
            createDesktopShortcut = $true
            createStartMenuShortcut = $true
            shortcutName = "WE4ALL Super-App"
            runAfterFinish = $true
            artifactName = "WE4ALL-SuperApp-Setup-v$newVer.exe"
        }
    }
} | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText((Join-Path $winWorkspace "package.json"), $builderPkg, $utf8)

Push-Location $winWorkspace
if (-not (Test-Path (Join-Path $winWorkspace "node_modules\electron-builder"))) {
    Write-Host "Installing electron & electron-builder in local build cache (one-time setup)..." -ForegroundColor Yellow
    npm install electron electron-builder --save-dev --no-audit --no-fund
}
Remove-Item -Path (Join-Path $winWorkspace "release") -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win nsis --x64 --config.directories.output=release
Pop-Location

# 5. Copy Single Versioned Setup Installer & Portable Unpacked App to Desktop (Removing All Old Versions)
$setupExeName = "WE4ALL-SuperApp-Setup-v$newVer.exe"
$builtSetupExe = Join-Path $winWorkspace "release\$setupExeName"
$unpackedExe = Join-Path $winWorkspace "release\win-unpacked\WE4ALL Super-App.exe"

if (Test-Path $builtSetupExe) {
    Remove-Item -Path (Join-Path $desktop "WE4ALL-SuperApp-Setup-v*.exe") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $root "WE4ALL-SuperApp-Setup-v*.exe") -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path $desktop -Directory -Filter "WE4ALL-SuperApp-Windows-v*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $desktop "WE4ALL-SuperApp-v*.lnk") -Force -ErrorAction SilentlyContinue

    Copy-Item $builtSetupExe (Join-Path $desktop $setupExeName) -Force
    # Keep 116MB .exe on Desktop only (outside Git root)
}

$apkMb = [math]::Round((Get-Item (Join-Path $desktop $apkFileName)).Length / 1MB, 2)
$exeMb = if (Test-Path (Join-Path $desktop $setupExeName)) { [math]::Round((Get-Item (Join-Path $desktop $setupExeName)).Length / 1MB, 2) } else { 0 }

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  BOTH NATIVE PLATFORMS BUILT & PREVIOUS VERSIONS REMOVED!" -ForegroundColor Green
Write-Host "  1. Android Mobile APK  ($apkMb MB):" -ForegroundColor Cyan
Write-Host "     $(Join-Path $desktop $apkFileName)" -ForegroundColor Yellow
Write-Host "  2. Windows Setup Wizard ($exeMb MB - Includes T&C Approval):" -ForegroundColor Cyan
Write-Host "     $(Join-Path $desktop $setupExeName)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green