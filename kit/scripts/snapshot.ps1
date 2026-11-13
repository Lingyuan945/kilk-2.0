param(
    [string]$Label = 'update',
    [switch]$SkipBundle
)

# Create a self-contained backup folder for one complete update.
# Usage: .\kit\scripts\snapshot.ps1 -Label "hotel-fix-autoBuilding"
#
# Output: kit\private\backups\<yyyyMMdd-HHmmss>_<label>\
#   source\        readable snapshot of code and docs (no deps / no artifacts)
#   repo.bundle    full git history (git clone repo.bundle restore)
#   MANIFEST.json  commit, branch, time, size, file count
#   CHANGES.md     recent commits and working tree status
#   README.md      how to restore

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$git = Join-Path $root 'kit\private\tools\PortableGit\cmd\git.exe'
$backups = Join-Path $root 'kit\private\backups'

if (-not (Test-Path -LiteralPath $git)) {
    Write-Error "PortableGit not found at $git"
    exit 1
}

New-Item -ItemType Directory -Path $backups -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$safeLabel = ($Label -replace '[\\/:*?"<>|\s]+', '-').Trim('-')
if (-not $safeLabel) { $safeLabel = 'update' }
$folderName = "${stamp}_${safeLabel}"
$dest = Join-Path $backups $folderName
$src = Join-Path $dest 'source'

New-Item -ItemType Directory -Path $src -Force | Out-Null
Write-Output "snapshot -> $dest"

# 1) Source snapshot
$excludeDirs = @(
    (Join-Path $root 'node_modules'),
    (Join-Path $root 'dist'),
    (Join-Path $root '.git'),
    (Join-Path $root 'kit\private'),
    (Join-Path $root 'maintenance'),
    (Join-Path $root 'server\node_modules'),
    (Join-Path $root 'server\pg-local-data'),
    (Join-Path $root 'server\pg-local-data-backup')
)
$robocopyArgs = @($root, $src, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1')
$robocopyArgs += '/XD'
$robocopyArgs += $excludeDirs
$robocopyArgs += '/XF'
$robocopyArgs += @('*.log', '*.tar.gz')
& robocopy @robocopyArgs | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Output "SNAPSHOT COPY FAILED (robocopy exit $rc)"
    exit 1
}
Write-Output "source copied (robocopy exit $rc)"

Push-Location $root
$commit = (& $git rev-parse --short HEAD 2>$null)
$branch = (& $git rev-parse --abbrev-ref HEAD 2>$null)
$status = (& $git status --porcelain 2>$null)
$recent = (& $git log --oneline -12 2>$null)
Pop-Location

$dirty = ($status | Measure-Object).Count -gt 0

# 2) Git bundle
$bundlePath = Join-Path $dest 'repo.bundle'
$bundleStatus = 'skipped'
if (-not $SkipBundle) {
    Push-Location $root
    & $git bundle create $bundlePath --all 2>&1 | Out-Null
    $bundleExit = $LASTEXITCODE
    Pop-Location
    if ($bundleExit -eq 0 -and (Test-Path -LiteralPath $bundlePath)) { $bundleStatus = 'ok' }
    else { $bundleStatus = "failed (exit $bundleExit)" }
}
Write-Output "git bundle: $bundleStatus"

# 3) Changes
$changes = @()
$changes += "# Changes - $folderName"
$changes += ''
$changes += "- created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$changes += "- branch: $branch"
$changes += "- commit: $commit"
$changes += "- working tree dirty: $dirty"
$changes += ''
$changes += '## Recent commits'
$changes += ''
foreach ($line in $recent) { $changes += "- $line" }
$changes += ''
$changes += '## Uncommitted files'
$changes += ''
if ($dirty) { foreach ($line in $status) { $changes += "- $line" } } else { $changes += '- none' }
$changes -join "`r`n" | Set-Content -LiteralPath (Join-Path $dest 'CHANGES.md') -Encoding UTF8

# 4) Restore guide
$restore = @()
$restore += "# Restore - $folderName"
$restore += ''
$restore += '## Option A: restore full history'
$restore += ''
$restore += '```powershell'
$restore += "git clone repo.bundle kilk2-restore"
$restore += '```'
$restore += ''
$restore += '## Option B: read-only copy of the source'
$restore += ''
$restore += 'Copy the `source` folder anywhere and open it as project root.'
$restore += 'Note: node_modules, dist and kit/private are intentionally excluded.'
$restore += ''
$restore += '## Then'
$restore += ''
$restore += '1. `npm install` (Node 22+, see kit/onboarding/QUICKSTART.md for local node path)'
$restore += '2. `$env:VITE_API_BASE = "/api"; npx vite build`'
$restore += '3. Backend needs PostgreSQL and server/.env.'
$restore -join "`r`n" | Set-Content -LiteralPath (Join-Path $dest 'README.md') -Encoding UTF8

# 5) Manifest
$files = Get-ChildItem -LiteralPath $dest -Recurse -File -ErrorAction SilentlyContinue
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
$manifest = [ordered]@{
    label        = $Label
    folder       = $folderName
    createdAt    = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    branch       = "$branch".Trim()
    commit       = "$commit".Trim()
    dirty        = $dirty
    bundle       = $bundleStatus
    sourceFiles  = ($files | Where-Object { $_.FullName -like "$src*" } | Measure-Object).Count
    totalFiles   = ($files | Measure-Object).Count
    totalMB      = [math]::Round($totalBytes / 1MB, 2)
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $dest 'MANIFEST.json') -Encoding UTF8

# 6) Index
$indexLine = "| $folderName | $commit | $branch | $(if ($dirty) { 'dirty' } else { 'clean' }) | $($manifest.totalMB) MB | $Label |"
$indexPath = Join-Path $backups 'INDEX.md'
if (-not (Test-Path -LiteralPath $indexPath)) {
    $header = @(
        '# Snapshot index',
        '',
        '| folder | commit | branch | tree | size | label |',
        '|--------|--------|--------|------|------|-------|'
    )
    $header -join "`r`n" | Set-Content -LiteralPath $indexPath -Encoding UTF8
}
Add-Content -LiteralPath $indexPath -Value $indexLine -Encoding UTF8

# 7) State pointer
$state = Join-Path $root 'kit\private\state\last-snapshot.json'
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $state -Encoding UTF8

Write-Output "COMMIT $commit on $branch, dirty=$dirty"
Write-Output "FILES $($manifest.totalFiles), SIZE $($manifest.totalMB) MB"
Write-Output "DONE $dest"
