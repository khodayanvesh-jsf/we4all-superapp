# --- BUILD STANDALONE WE4ALL CUSTOMER APK (com.we4all.customer) ---
$ErrorActionPreference = "Continue"

function Save-Utf8NoBom([string]$RelativePath, [string]$Content) {
    $FullPath = Join-Path (Get-Location).Path $RelativePath
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($FullPath, $Content, $Utf8NoBom)
}

Write-Host "1. Building Vite bundle locked to Customer Marketplace (VITE_APP_PORTAL=customer)..." -ForegroundColor Cyan
$env:VITE_APP_PORTAL = "customer"
npm run build
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:\VITE_APP_PORTAL -ErrorAction SilentlyContinue
    Write-Host "Vite web build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "2. Syncing Capacitor Android assets..." -ForegroundColor Cyan
npx cap sync android

# Backup Android config files in memory (BOM-free)
$stringsXml = "android/app/src/main/res/values/strings.xml"
$appGradle  = "android/app/build.gradle"
$googleJson = "android/app/google-services.json"

$origStrings = if (Test-Path $stringsXml) { [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $stringsXml)).TrimStart([char]0xFEFF) } else { $null }
$origGradle  = if (Test-Path $appGradle)  { [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $appGradle)).TrimStart([char]0xFEFF) }  else { $null }
$origGoogle  = if (Test-Path $googleJson) { [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $googleJson)).TrimStart([char]0xFEFF) } else { $null }

Write-Host "3. Applying Customer APK package ID (com.we4all.customer) and App Name..." -ForegroundColor Cyan
if ($origStrings) {
    $patchedStrings = $origStrings -replace '<string name="app_name">.*?</string>', '<string name="app_name">WE4ALL Customer</string>'
    $patchedStrings = $patchedStrings -replace '<string name="title_activity_main">.*?</string>', '<string name="title_activity_main">WE4ALL Customer</string>'
    Save-Utf8NoBom $stringsXml $patchedStrings
}
if ($origGradle) {
    $patchedGradle = $origGradle -replace 'applicationId\s*(=)?\s*["''][^"'']+["'']', 'applicationId "com.we4all.customer"'
    Save-Utf8NoBom $appGradle $patchedGradle
}
if ($origGoogle) {
    $patchedGoogle = $origGoogle -replace '"package_name"\s*:\s*"[^"]+"', '"package_name": "com.we4all.customer"'
    Save-Utf8NoBom $googleJson $patchedGoogle
}

Write-Host "4. Compiling Android APK via Gradle..." -ForegroundColor Cyan
Push-Location android
./gradlew assembleDebug
$gradleExit = $LASTEXITCODE
Pop-Location

# Restore original Android files so Git working tree stays clean
if ($origStrings) { Save-Utf8NoBom $stringsXml $origStrings }
if ($origGradle)  { Save-Utf8NoBom $appGradle $origGradle }
if ($origGoogle)  { Save-Utf8NoBom $googleJson $origGoogle }
Remove-Item Env:\VITE_APP_PORTAL -ErrorAction SilentlyContinue

if ($gradleExit -eq 0) {
    New-Item -ItemType Directory -Force -Path "releases" | Out-Null
    Copy-Item "android/app/build/outputs/apk/debug/app-debug.apk" "releases/WE4ALL-Customer-Debug.apk" -Force
    $apkFile = Get-Item "releases/WE4ALL-Customer-Debug.apk"
    $sizeMB  = [math]::Round($apkFile.Length / 1MB, 2)
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "STANDALONE CUSTOMER APK READY!" -ForegroundColor Green
    Write-Host "File:         $($apkFile.FullName)" -ForegroundColor Cyan
    Write-Host "App Name:     WE4ALL Customer" -ForegroundColor Cyan
    Write-Host "Package ID:   com.we4all.customer" -ForegroundColor Cyan
    Write-Host "Size:         $sizeMB MB | Built: $($apkFile.LastWriteTime)" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Green
} else {
    Write-Host "Gradle APK build failed with exit code $gradleExit." -ForegroundColor Red
    exit 1
}