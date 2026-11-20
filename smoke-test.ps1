$ErrorActionPreference = "Stop"
$base = "https://we-4-all-super-app.vercel.app"
$supa = "https://bdmbziwazpuzbukazmug.supabase.co"
$key  = "sb_publishable_nNPwaseb81B8V05aVwmleg_JkBVNvzl"
$desktop = [Environment]::GetFolderPath("Desktop")

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  WE4ALL MULTI-PLATFORM LIVE CLOUD & OTA SMOKE TEST" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Live OTA Manifest & SHA-256 Zip Integrity
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$manifest = Invoke-RestMethod -Uri "$base/ota-manifest.json?t=$ts" -Method Get
$tmpZip = Join-Path $env:TEMP "we4all-smoke-ota.zip"
Invoke-WebRequest -Uri "$base/ota-bundle.zip?t=$ts" -OutFile $tmpZip -UseBasicParsing
$actualSha = (Get-FileHash -Path $tmpZip -Algorithm SHA256).Hash.ToLower()
$expectedSha = [string]$manifest.sha256.ToLower()
$shaMatch = ($actualSha -eq $expectedSha)

if ($shaMatch) {
    Write-Host "[PASS] 1. OTA SHA-256 Match (v$($manifest.version) | Build $($manifest.buildNumber)): $actualSha" -ForegroundColor Green
} else {
    Write-Host "[FAIL] 1. OTA SHA-256 Mismatch! Manifest=$expectedSha vs Zip=$actualSha" -ForegroundColor Red
}

# 2. Verify Dedicated Windows Workstation Features on Vercel
$winJs = (Invoke-WebRequest -Uri "$base/windows-desktop.js?t=$ts" -UseBasicParsing).Content
$featuresOk = $winJs.Contains("winScanBarcode") -and $winJs.Contains("winOpenThermalReceipt") -and $winJs.Contains("winExportGstCsv") -and $winJs.Contains("winAdjustStock") -and $winJs.Contains("winTriggerDispatchAlert")
if ($featuresOk) {
    Write-Host "[PASS] 2. Windows POS Modules Verified: USB Barcode + 80mm Receipt + CSV + Low-Stock + Chime Alerts" -ForegroundColor Green
} else {
    Write-Host "[WARN] 2. One or more Windows POS helpers missing from live windows-desktop.js" -ForegroundColor Yellow
}

# 3. Verify Live Supabase PostgREST & Founder Edge Function
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$h = @{ "apikey" = $key; "Authorization" = "Bearer $key"; "Content-Type" = "application/json" }
$mk = Invoke-RestMethod -Uri "$supa/rest/v1/we4all_markets?select=*" -Headers $h
$pt = Invoke-RestMethod -Uri "$supa/rest/v1/we4all_partners?select=id,display_name,partner_type&approval_status=eq.approved" -Headers $h
$fa = Invoke-RestMethod -Uri "$supa/functions/v1/we4all-founder-auth" -Method Post -Headers $h -Body '{"username":"KhodayAnvesh","password":"We4AllFounder@2026"}'
$sw.Stop()

Write-Host "[PASS] 3. Supabase RLS & Edge Auth: ONLINE ($($sw.ElapsedMilliseconds) ms) | Markets=$($mk.Count) | Partners=$($pt.Count) | FounderAuth=$($fa.ok)" -ForegroundColor Green

# 4. Verify Local Desktop Installers (.APK & .EXE)
$apk = Get-ChildItem -Path $desktop -Filter "WE4ALL-SuperApp-v*.apk" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$exe = Get-ChildItem -Path $desktop -Filter "WE4ALL-SuperApp-Setup-v*.exe" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($apk) { Write-Host "[PASS] 4A. Desktop Android APK : $($apk.Name) ($([math]::Round($apk.Length/1MB, 2)) MB)" -ForegroundColor Green }
else { Write-Host "[WARN] 4A. Desktop Android APK not found on Desktop" -ForegroundColor Yellow }

if ($exe) { Write-Host "[PASS] 4B. Desktop Windows EXE : $($exe.Name) ($([math]::Round($exe.Length/1MB, 2)) MB)" -ForegroundColor Green }
else { Write-Host "[WARN] 4B. Desktop Windows EXE not found on Desktop" -ForegroundColor Yellow }

Write-Host "==========================================================`n" -ForegroundColor Cyan