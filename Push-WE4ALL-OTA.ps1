param(
    [string]$NewVersion = "",
    [string]$ReleaseNotes = "New WE4ALL feature update deployed! Tap Update & Restart to load the latest features with zero data loss."
)
$ErrorActionPreference = "Continue"
$projectRoot = "$HOME\Desktop\WE4ALL-SuperApp"
Set-Location -Path $projectRoot
$utf8NoBom = New-Object System.Text.UTF8Encoding($False)

# Auto-increment patch version (e.g. 3.3.2 -> 3.3.3) if -NewVersion is not passed
$pkgObj = Get-Content "$projectRoot\package.json" -Raw | ConvertFrom-Json
$currVer = $pkgObj.version
if (-not $NewVersion) {
    $parts = $currVer.Split(".")
    if ($parts.Count -eq 3) {
        $nextPatch = [int]$parts[2] + 1
        $NewVersion = "$($parts[0]).$($parts[1]).$nextPatch"
    } else {
        $NewVersion = "3.3.3"
    }
}

Write-Host "==================================================================" -ForegroundColor Magenta
Write-Host "  DEPLOYING NEW FEATURE & BROADCASTING OTA UPDATE: v$NewVersion" -ForegroundColor Magenta
Write-Host "==================================================================" -ForegroundColor Magenta

# 1. Stamp new version in package.json & src/supabaseClient.js
$pkgText = [System.IO.File]::ReadAllText("$projectRoot\package.json")
$pkgText = $pkgText -replace '"version":\s*"[^"]+"', "`"version`": `"$NewVersion`""
[System.IO.File]::WriteAllText("$projectRoot\package.json", $pkgText, $utf8NoBom)

if (Test-Path "$projectRoot\src\supabaseClient.js") {
    $supaText = [System.IO.File]::ReadAllText("$projectRoot\src\supabaseClient.js")
    $supaText = $supaText -replace 'CURRENT_SCHEMA_VERSION = "[^"]+"', "CURRENT_SCHEMA_VERSION = `"$NewVersion`""
    [System.IO.File]::WriteAllText("$projectRoot\src\supabaseClient.js", $supaText, $utf8NoBom)
}

# 2. Write public/ota-manifest.json with updateAvailable: true
$utcNow = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$manifest = @{
    currentVersion = $currVer
    latestAvailableVersion = $NewVersion
    updateAvailable = $true
    publishedAt = $utcNow
    liveServerUrl = "https://we-4-all-super-app.vercel.app"
    apkDownloadUrl = "https://we-4-all-super-app.vercel.app/WE4ALL.apk?v=$NewVersion"
    releaseNotes = "WE4ALL v${NewVersion}: $ReleaseNotes"
} | ConvertTo-Json -Depth 5

New-Item -ItemType Directory -Force -Path "$projectRoot\public" | Out-Null
[System.IO.File]::WriteAllText("$projectRoot\public\ota-manifest.json", $manifest, $utf8NoBom)

# 3. Build production bundle, copy latest APK if present, push to GitHub & deploy to Vercel
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm run build failed! Fix build errors before pushing OTA." -ForegroundColor Red
    exit 1
}

if (Test-Path "$HOME\Desktop\WE4ALL-Latest.apk") {
    Copy-Item "$HOME\Desktop\WE4ALL-Latest.apk" "$projectRoot\dist\WE4ALL.apk" -Force
}

git add -A
git commit -m "feat(ota): deploy v$NewVersion - $ReleaseNotes"
git push origin main
npx vercel --prod --yes

# 4. Also broadcast the new OTA version to the live /api/sync cloud state so active screens get an instant push toast
try {
    $syncRes = Invoke-RestMethod -Uri "https://we-4-all-super-app.vercel.app/api/sync" -Method Get -ErrorAction SilentlyContinue
    $payload = if ($syncRes.state_payload) { $syncRes.state_payload } else { @{} }
    $payload | Add-Member -NotePropertyName "appUpdateInfo" -NotePropertyValue @{
        currentVersion = $currVer
        latestAvailableVersion = $NewVersion
        updateAvailable = $true
        publishedAt = $utcNow
        liveServerUrl = "https://we-4-all-super-app.vercel.app"
        apkDownloadUrl = "https://we-4-all-super-app.vercel.app/WE4ALL.apk?v=$NewVersion"
        releaseNotes = "WE4ALL v${NewVersion}: $ReleaseNotes"
    } -Force
    $bodyJson = @{ state_payload = $payload } | ConvertTo-Json -Depth 10 -Compress
    Invoke-RestMethod -Uri "https://we-4-all-super-app.vercel.app/api/sync" -Method Post -ContentType "application/json" -Body $bodyJson | Out-Null
} catch {}

Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  SUCCESS: WE4ALL v$NewVersion DEPLOYED & OTA PUSHED TO ALL PHONES!" -ForegroundColor Green
Write-Host "  Live OTA Manifest: https://we-4-all-super-app.vercel.app/ota-manifest.json" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Green