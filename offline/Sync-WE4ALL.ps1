param(
    [string]$Destination = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WE4ALL-Workspace'),
    [string]$Branch = 'main',
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
    Run git @('clone', '--branch', $Branch, $RepoUrl, $Destination)
} else {
    if (-not (Test-Path (Join-Path $Destination '.git'))) {
        throw "The destination is not a Git clone: $Destination. Choose an empty destination; keep your existing files."
    }
    Push-Location $Destination
    try {
        $origin = (& git remote get-url origin).Trim()
        $current = (& git branch --show-current).Trim()
        if ($origin -ne $RepoUrl) { throw "Unexpected Git origin: $origin. No files changed." }
        $upgradeFromLegacyBranch = $Branch -eq 'main' -and $current -in @('codex/we4all-offline-sync', 'codex/we4all-real-trial')
        if ($current -ne $Branch -and -not $upgradeFromLegacyBranch) {
            throw "This copy is on $current; expected $Branch. Choose that branch explicitly or use a separate destination."
        }
        if ((& git status --porcelain).Length -gt 0) {
            throw 'Local changes found. Commit or save them elsewhere before synchronizing. No files changed.'
        }
        Run git @('config', '--replace-all', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*')
        Run git @('fetch', '--prune', 'origin')
        $remoteBranch = "refs/remotes/origin/$Branch"
        if ($upgradeFromLegacyBranch) {
            & git merge-base --is-ancestor HEAD $remoteBranch
            if ($LASTEXITCODE -ne 0) {
                throw 'The older workspace has commits outside the target branch. Keep this workspace and clone into a separate destination.'
            }
            & git show-ref --verify --quiet "refs/heads/$Branch"
            if ($LASTEXITCODE -eq 0) {
                & git merge-base --is-ancestor "refs/heads/$Branch" $remoteBranch
                if ($LASTEXITCODE -ne 0) { throw 'The local target branch has separate commits. Review it before switching.' }
                Run git @('switch', $Branch)
            } else {
                Run git @('switch', '--track', '-c', $Branch, "origin/$Branch")
            }
        }
        Run git @('merge', '--ff-only', $remoteBranch)
    } finally { Pop-Location }
}

Push-Location $Destination
try {
    $commit = (& git rev-parse HEAD).Trim()
    Write-Host "WE4ALL $Branch is now at $commit"
    Write-Host "Source folder: $Destination"
    Write-Host 'All GitHub branches are available under origin in VS Code.'
    Write-Host 'Includes Android source, Supabase migrations/functions, web modules and CI configuration.'
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
