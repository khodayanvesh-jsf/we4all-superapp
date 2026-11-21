$gradle = "android\app\build.gradle"
$content = Get-Content $gradle -Raw
if ($content -match "versionCode (\d+)") { $newCode = [int]$matches[1] + 1 } else { $newCode = 355 }
if ($content -match 'versionName "(\d+)\.(\d+)\.(\d+)"') { $newVer = "$($matches[1]).$($matches[2]).$([int]$matches[3] + 1)" } else { $newVer = "3.3.$newCode" }
$content = $content -replace "versionCode \d+", "versionCode $newCode" -replace 'versionName "[^"]+"', "versionName `"$newVer`""
Set-Content $gradle $content -NoNewline

$appVerContent = "export const APP_VERSION = `"$newVer`";`nexport const APP_BUILD_NUMBER = $newCode;`n"
Set-Content "src\appVersion.js" $appVerContent -NoNewline

(Get-Content "src\supabaseClient.js" -Raw) -replace 'CURRENT_SCHEMA_VERSION = "[^"]+"', "CURRENT_SCHEMA_VERSION = `"$newVer`"" | Set-Content "src\supabaseClient.js" -NoNewline
if (Test-Path "tests\installedAppVersion.test.js") {
  $t = Get-Content "tests\installedAppVersion.test.js" -Raw
  $t = $t -replace 'APP_VERSION = "\d+\.\d+\.\d+"', "APP_VERSION = `"$newVer`""
  $t = $t -replace 'APP_BUILD_NUMBER = \d+', "APP_BUILD_NUMBER = $newCode"
  $t = $t -replace 'pkg\.version, "\d+\.\d+\.\d+"', "pkg.version, `"$newVer`""
  $t = $t -replace 'versionCode \d+', "versionCode $newCode"
  $t = $t -replace 'versionName "\d+\.\d+\.\d+"', "versionName `"$newVer`""
  $t = $t -replace 'CURRENT_SCHEMA_VERSION = "\d+\.\d+\.\d+"', "CURRENT_SCHEMA_VERSION = `"$newVer`""
  Set-Content "tests\installedAppVersion.test.js" $t -NoNewline
}

npm version $newVer --no-git-tag-version --allow-same-version
Write-Host "Upgraded App & UI to v$newVer (Code: $newCode)" -ForegroundColor Green
git add .
git commit -m "Release v$newVer"
git push