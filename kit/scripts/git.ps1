param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$GitArgs
)

# Wrapper for the bundled portable Git.
# Usage: .\kit\scripts\git.ps1 status
#        .\kit\scripts\git.ps1 log --oneline -5

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$git = Join-Path $root 'kit\private\tools\PortableGit\cmd\git.exe'

if (-not (Test-Path -LiteralPath $git)) {
    Write-Error "PortableGit not found at $git"
    exit 1
}

Push-Location $root
try {
    & $git @GitArgs
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
