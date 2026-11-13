# --- WE4ALL Standalone Merchant APK Builder ---
$ErrorActionPreference = "Stop"

# Remove any accidental .bak files left in res/values
Remove-Item "android/app/src/main/res/values/*.bak" -Force -ErrorAction SilentlyContinue
Remove-Item "android/app/*.bak" -Force -ErrorAction SilentlyContinue

function Save-Utf8NoBom([string]$RelativePath, [string]$Content) {
    $FullPath = Join-Path (Get-Location).Path $RelativePath
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($FullPath, $Content, $Utf8NoBom)
}

Write-Host "Building WE4ALL Merchant APK..." -ForegroundColor Cyan

$env:VITE_APP_PORTAL = "merchant"
npm run build
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:\VITE_APP_PORTAL -ErrorAction SilentlyContinue
    exit 1
}

npx cap sync android

$stringsXml = "android/app/src/main/res/values/strings.xml"
$appGradle  = "android/app/build.gradle"
$googleJson = "android/app/google-services.json"

$origStrings = if (Test-Path $stringsXml) { [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $stringsXml)).TrimStart([char]0xFEFF) } else { $null }
$origGradle  = if (Test-Path $appGradle)  { [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $appGradle)).TrimStart([char]0xFEFF) }  else { $null }
$origGoogle  = if (Test-Path $googleJson) { [System.IO.File]::ReadAllText((Join-Path (Get-Location).Path $googleJson)).TrimStart([char]0xFEFF) } else { $null }

if ($origStrings) {
    $patchedStrings = $origStrings -replace '<string name="app_name">.*?</string>', '<string name="app_name">WE4ALL Merchant</string>'
    $patchedStrings = $patchedStrings -replace '<string name="title_activity_main">.*?</string>', '<string name="title_activity_main">WE4ALL Merchant</string>'
    Save-Utf8NoBom $stringsXml $patchedStrings
}

if ($origGradle) {
    $patchedGradle = $origGradle -replace 'applicationId\s*(=)?\s*["''][^"'']+["'']', 'applicationId "com.we4all.merchant"'
    Save-Utf8NoBom $appGradle $patchedGradle
}

if ($origGoogle) {
    $patchedGoogle = $origGoogle -replace '"package_name"\s*:\s*"[^"]+"', '"package_name": "com.we4all.merchant"'
    Save-Utf8NoBom $googleJson $patchedGoogle
}

Push-Location android
./gradlew assembleDebug
$gradleExit = $LASTEXITCODE
Pop-Location

if ($origStrings) { Save-Utf8NoBom $stringsXml $origStrings }
if ($origGradle)  { Save-Utf8NoBom $appGradle $origGradle }
if ($origGoogle)  { Save-Utf8NoBom $googleJson $origGoogle }
Remove-Item Env:\VITE_APP_PORTAL -ErrorAction SilentlyContinue

if ($gradleExit -eq 0) {
    New-Item -ItemType Directory -Force -Path "releases" | Out-Null
    $apkSource = "android/app/build/outputs/apk/debug/app-debug.apk"
    $apkDest   = "releases/WE4ALL-Merchant-Debug.apk"
    Copy-Item $apkSource $apkDest -Force
    Write-Host "SUCCESS! Standalone Merchant APK created at: $apkDest" -ForegroundColor Green
} else {
    Write-Host "Gradle build failed." -ForegroundColor Red
}