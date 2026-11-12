param(
    [string]$ProjectRef = 'bdmbziwazpuzbukazmug',
    [string]$Destination = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WE4ALL-Backups'),
    [string[]]$Buckets = @()
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    throw 'Install Supabase CLI and sign in with supabase login before backing up.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Install and start Docker Desktop. Supabase db dump uses Docker.'
}
$repo = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $repo 'supabase/config.toml'))) {
    throw 'Run this script from the full WE4ALL source checkout.'
}
$snapshot = Join-Path $Destination ("we4all-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force $snapshot | Out-Null
$success = $false
function Run([string[]]$Arguments) {
    & supabase @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Supabase CLI command failed (exit code $LASTEXITCODE)." }
}
Push-Location $repo
try {
    # Link may ask for the database password. Never put that password in a script or CLI argument.
    Run @('link', '--project-ref', $ProjectRef)
    Run @('db', 'dump', '--linked', '--schema', 'public,auth,storage,we4all_rides_private', '--file', (Join-Path $snapshot 'schema.sql'))
    Run @('db', 'dump', '--linked', '--schema', 'public,auth,storage,we4all_rides_private', '--data-only', '--use-copy', '--file', (Join-Path $snapshot 'data.sql'))
    Run @('db', 'dump', '--linked', '--role-only', '--file', (Join-Path $snapshot 'roles.sql'))
    if ($Buckets.Count -eq 0) {
        $listing = & supabase storage ls 'ss:///' --linked --output json
        if ($LASTEXITCODE -ne 0) { throw 'Could not list Storage buckets. Rerun with -Buckets @("bucket-name", ...).' }
        $parsed = $listing | ConvertFrom-Json
        $Buckets = @($parsed | ForEach-Object { if ($_.id) { $_.id } elseif ($_.name) { $_.name } })
        if ($Buckets.Count -eq 0) {
            throw 'No Storage buckets discovered. If buckets exist, specify all names with -Buckets.'
        }
    }
    foreach ($bucket in $Buckets) {
        if ($bucket -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]*$') { throw "Invalid bucket name: $bucket" }
        $target = Join-Path (Join-Path $snapshot 'storage') $bucket
        New-Item -ItemType Directory -Force $target | Out-Null
        Run @('storage', 'cp', '--linked', '--recursive', "ss:///$bucket", $target)
    }
    $files = Get-ChildItem $snapshot -Recurse -File
    $manifest = [ordered]@{
        project = $ProjectRef
        exportedUtc = (Get-Date).ToUniversalTime().ToString('o')
        buckets = @($Buckets)
        files = @($files | ForEach-Object { [ordered]@{
            path = $_.FullName.Substring($snapshot.Length + 1)
            sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
        } })
        note = 'Source code and server secrets are not included; verify the restore in a separate test project.'
    }
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 (Join-Path $snapshot 'manifest.json')
    $success = $true
    Write-Host "Backup completed: $snapshot"
} finally {
    Pop-Location
    if (-not $success) {
        Write-Warning "Backup incomplete. Inspect or remove the partial folder: $snapshot"
    }
}
