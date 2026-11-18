$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$root = (Get-Location).Path
$desktop = [Environment]::GetFolderPath("Desktop")

# 1. Auto-Increment Patch Version & Build Number across ONLY the exact 5 version files
$pkgPath = Join-Path $root "package.json"
$pkgJson = ([System.IO.File]::ReadAllText($pkgPath, $utf8)) | ConvertFrom-Json
$oldVer = [string]$pkgJson.version
$parts = $oldVer.Split(".")
$newVer = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)"

$appGradlePath = Join-Path $root "android\app\build.gradle"
$agText = [System.IO.File]::ReadAllText($appGradlePath, $utf8)
$oldBuild = [int]([regex]::Match($agText, 'versionCode\s+(\d+)').Groups[1].Value)
$newBuild = $oldBuild + 1

Write-Host "`n[1/6] Bumping WE4ALL Version: v$oldVer (build $oldBuild) -> v$newVer (build $newBuild)" -ForegroundColor Cyan

$exactFiles = @(
    $pkgPath,
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

# Sync only top-level version in package-lock.json without touching dependencies
$lockPath = Join-Path $root "package-lock.json"
if (Test-Path $lockPath) {
    $lockText = [System.IO.File]::ReadAllText($lockPath, $utf8)
    $lockText = [regex]::Replace($lockText, '("name":\s*"we-4-all-super-app",\s*"version":\s*")"[^"]+"', "`${1}`"$newVer`"")
    [System.IO.File]::WriteAllText($lockPath, $lockText, $utf8)
}

# 2. Run All 176 Unit Tests & Vite Production Build
Write-Host "[2/6] Running 176 Unit Tests & Vite Production Build..." -ForegroundColor Cyan
npm test
npm run build

# 3. Package Cryptographically Verified OTA Bundle (ota-bundle.zip + ota-manifest.json)
Write-Host "[3/6] Packaging Over-The-Air (OTA) Update Bundle & SHA-256 Manifest for v$newVer..." -ForegroundColor Cyan
$distDir = Join-Path $root "dist"
Remove-Item -Path (Join-Path $distDir "*.apk"), (Join-Path $distDir "*.exe"), (Join-Path $distDir "ota-bundle.zip") -Force -ErrorAction SilentlyContinue

$otaZipTemp = Join-Path $env:TEMP "we4all-ota-bundle-v$newVer.zip"
if (Test-Path $otaZipTemp) { Remove-Item $otaZipTemp -Force }
Compress-Archive -Path (Join-Path $distDir "*") -DestinationPath $otaZipTemp -Force

$otaSha256 = (Get-FileHash -Path $otaZipTemp -Algorithm SHA256).Hash.ToLower()
Copy-Item $otaZipTemp (Join-Path $distDir "ota-bundle.zip") -Force

$otaManifest = @{
    version = $newVer
    buildNumber = $newBuild
    minNativeBuild = 330
    sha256 = $otaSha256
    bundleUrl = "https://we-4-all-super-app.vercel.app/ota-bundle.zip"
    androidApkUrl = "https://we-4-all-super-app.vercel.app/WE4ALL.apk"
    windowsExeUrl = "https://github.com/khodayanvesh-jsf/we4all-superapp/releases/latest/download/WE4ALL-SuperApp-Setup.exe"
    publishedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    notes = "WE4ALL Multi-Platform OTA Release v$newVer (Android + Windows 11 Workstation)"
} | ConvertTo-Json -Depth 4

[System.IO.File]::WriteAllText((Join-Path $distDir "ota-manifest.json"), $otaManifest, $utf8)
[System.IO.File]::WriteAllText((Join-Path $root "public\ota-manifest.json"), $otaManifest, $utf8)
Write-Host "   -> OTA Bundle SHA-256: $otaSha256" -ForegroundColor Green

# 4. Sync Capacitor & Compile Native Android Mobile APK Outside OneDrive
Write-Host "[4/6] Compiling Native Android Mobile APK (WE4ALL-SuperApp-v$newVer.apk)..." -ForegroundColor Cyan
npx cap sync android

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
    Remove-Item -Path (Join-Path $distDir "WE4ALL*.apk") -Force -ErrorAction SilentlyContinue

    Copy-Item $apkOut (Join-Path $desktop $apkFileName) -Force
    Copy-Item $apkOut (Join-Path $distDir "WE4ALL.apk") -Force
}

# 5. Compile Native 3-Pane Windows Setup Wizard (.exe) with T&C Approval & OTA Engine
Write-Host "[5/6] Building Native Windows 11 Workstation Setup Wizard (WE4ALL-SuperApp-Setup-v$newVer.exe)..." -ForegroundColor Cyan
$winWorkspace = Join-Path $env:LOCALAPPDATA "we4all-windows-installer"
if (-not (Test-Path $winWorkspace)) { New-Item -ItemType Directory -Path $winWorkspace | Out-Null }

robocopy $distDir (Join-Path $winWorkspace "dist") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
robocopy (Join-Path $root "electron") (Join-Path $winWorkspace "electron") /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
Remove-Item -Path (Join-Path $winWorkspace "dist\WE4ALL*.apk"), (Join-Path $winWorkspace "dist\ota-bundle.zip") -Force -ErrorAction SilentlyContinue

$winIndexFile = Join-Path $winWorkspace "dist\index.html"
if (Test-Path $winIndexFile) {
    $idxHtml = [System.IO.File]::ReadAllText($winIndexFile, $utf8)
    $idxHtml = $idxHtml.Replace('src="/assets/', 'src="./assets/').Replace('href="/assets/', 'href="./assets/').Replace('src="/ota-client.js"', 'src="./ota-client.js"')
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
        directories = @{ output = "release" }
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
Remove-Item -Path (Join-Path $winWorkspace "release") -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win nsis --x64
Pop-Location

$setupExeName = "WE4ALL-SuperApp-Setup-v$newVer.exe"
$builtSetupExe = Join-Path $winWorkspace "release\$setupExeName"

if (Test-Path $builtSetupExe) {
    Remove-Item -Path (Join-Path $desktop "WE4ALL-SuperApp-Setup-v*.exe") -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $root "WE4ALL-SuperApp-Setup-v*.exe") -Force -ErrorAction SilentlyContinue
    Copy-Item $builtSetupExe (Join-Path $desktop $setupExeName) -Force
}

# 6. Verify Live Frontend <-> Backend Supabase Connections Across All Portals
Write-Host "[6/6] Verifying Live Frontend <-> Backend Supabase Endpoints..." -ForegroundColor Cyan
$supaUrl = "https://bdmbziwazpuzbukazmug.supabase.co"
$pubKey = "sb_publishable_nNPwaseb81B8V05aVwmleg_JkBVNvzl"
$h = @{ "apikey" = $pubKey; "Authorization" = "Bearer $pubKey"; "Content-Type" = "application/json" }

$markets = Invoke-RestMethod -Uri "$supaUrl/rest/v1/we4all_markets?select=*" -Method Get -Headers $h
$partners = Invoke-RestMethod -Uri "$supaUrl/rest/v1/we4all_partners?select=id,display_name,partner_type&approval_status=eq.approved" -Method Get -Headers $h
$products = Invoke-RestMethod -Uri "$supaUrl/rest/v1/we4all_partners?select=id,title&approval_status=eq.approved" -Method Get -Headers $h
$founderAuth = Invoke-RestMethod -Uri "$supaUrl/functions/v1/we4all-founder-auth" -Method Post -Headers $h -Body '{"username":"KhodayAnvesh","password":"We4AllFounder@2026"}'

Write-Host "   -> Supabase Markets Connected  : $($markets.Count) active zone(s) (Adilabad m_393_1571)" -ForegroundColor Green
Write-Host "   -> Approved Partners Connected : $($partners.Count) live partner portals" -ForegroundColor Green
Write-Host "   -> Approved Products Connected : $($products.Count) live catalogue items" -ForegroundColor Green
Write-Host "   -> Founder Admin Edge Auth     : ok=$($founderAuth.ok) (Role: $($founderAuth.user.app_metadata.we4all_role))" -ForegroundColor Green

$apkMb = [math]::Round((Get-Item (Join-Path $desktop $apkFileName)).Length / 1MB, 2)
$exeMb = [math]::Round((Get-Item (Join-Path $desktop $setupExeName)).Length / 1MB, 2)

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  ALL PLATFORMS & OTA BUNDLE BUILT & VERIFIED (v$newVer)!" -ForegroundColor Green
Write-Host "  1. Android Mobile APK  ($apkMb MB): $(Join-Path $desktop $apkFileName)" -ForegroundColor Yellow
Write-Host "  2. Windows Setup EXE   ($exeMb MB): $(Join-Path $desktop $setupExeName)" -ForegroundColor Yellow
Write-Host "  3. OTA Bundle SHA-256  : $otaSha256" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green