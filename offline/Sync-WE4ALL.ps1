param(
    [string]$Destination = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WE4ALL-Workspace'),
    [string]$Branch = 'codex/we4all-offline-sync',
    [string]$RepoUrl = 'https://github.com/khodayanvesh-jsf/we4all-superapp.git',
    [switch]$Install,
    [switch]$Verify
)

$ErrorActionPreference = 'Stop'
function Run([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit code $LASTEXITCODE)." }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Install Git for Windows, then run this script again.'
}

if (-not (Test-Path $Destination)) {
    $parent = Split-Path -Parent $Destination
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force $parent | Out-Null }
    Run git @('clone', '--branch', $Branch, '--single-branch', $RepoUrl, $Destination)
} else {
    if (-not (Test-Path (Join-Path $Destination '.git'))) {
        throw "The destination is not a Git clone: $Destination. Choose an empty destination; keep your existing files."
    }
    Push-Location $Destination
    try {
        $origin = (& git remote get-url origin).Trim()
        $current = (& git branch --show-current).Trim()
        if ($origin -ne $RepoUrl) { throw "Unexpected Git origin: $origin. No files changed." }
        if ($current -ne $Branch) { throw "This copy is on $current; expected $Branch. No files changed." }
        if ((& git status --porcelain).Length -gt 0) {
            throw 'Local changes found. Commit or save them elsewhere before synchronizing. No files changed.'
        }
        Run git @('fetch', '--prune', 'origin', $Branch)
        Run git @('merge', '--ff-only', 'FETCH_HEAD')
    } finally { Pop-Location }
}

Push-Location $Destination
try {
    $commit = (& git rev-parse HEAD).Trim()
    Write-Host "WE4ALL $Branch is now at $commit"
    Write-Host "Source folder: $Destination"
    Write-Host 'Includes Android source, Supabase migrations/functions, web modules and CI configuration.'
    if (-not (Test-Path '.env.local')) {
        Copy-Item '.env.example' '.env.local'
        Write-Host 'Created .env.local from public-value template; check its publishable key before online testing.'
    }
    if ($Install -or $Verify) {
        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 and npm.' }
        Run npm @('ci')
    }
    if ($Verify) {
        Run npm @('test')
        Run npm @('run', 'build')
    }
    Write-Host 'Live records and uploaded files are separate. See offline\Backup-WE4ALL-Data.ps1.'
} finally { Pop-Location }
