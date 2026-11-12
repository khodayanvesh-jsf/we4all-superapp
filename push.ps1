$gradle = "android\app\build.gradle"
$content = Get-Content $gradle -Raw
if ($content -match "versionCode (\d+)") { $newCode = [int]$matches[1] + 1 } else { $newCode = 2 }
if ($content -match 'versionName "(\d+)\.(\d+)\.(\d+)"') { $newVer = "$($matches[1]).$($matches[2]).$([int]$matches[3] + 1)" } else { $newVer = "1.1.$newCode" }
$content = $content -replace "versionCode \d+", "versionCode $newCode" -replace 'versionName "[^"]+"', "versionName `"$newVer`""
Set-Content $gradle $content -NoNewline
Set-Content -Path "src\version.ts" -Value "export const APP_VERSION = `"$newVer`";"
npm version $newVer --no-git-tag-version --allow-same-version
Write-Host "Upgraded App & UI to v$newVer (Code: $newCode)" -ForegroundColor Green
git add .
git commit -m "Release v$newVer"
git push
