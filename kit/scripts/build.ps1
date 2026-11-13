param(
    [switch]$Typecheck,
    [switch]$SkipBuild
)

# Typecheck and/or production build.
# Usage:
#   .\kit\scripts\build.ps1 -Typecheck        # typecheck only
#   .\kit\scripts\build.ps1                   # build only
#   .\kit\scripts\build.ps1 -Typecheck        # then build

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = 'C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

if (-not (Test-Path -LiteralPath $node)) {
    Write-Error "node not found at $node"
    exit 1
}

Push-Location $root
try {
    if ($Typecheck) {
        Write-Output '=== typecheck (tsc -p tsconfig.app.json) ==='
        & $node 'node_modules\typescript\bin\tsc' -p tsconfig.app.json 2>&1 | Out-String
        $tscExit = $LASTEXITCODE
        if ($tscExit -eq 0) { Write-Output 'TYPECHECK OK' }
        else { Write-Output "TYPECHECK FAILED (exit $tscExit) - 9 known baseline errors may be expected" }
    }

    if (-not $SkipBuild) {
        Write-Output '=== build (vite, VITE_API_BASE=/api) ==='
        $env:VITE_API_BASE = '/api'
        & $node 'node_modules\vite\bin\vite.js' build 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) {
            Write-Output 'BUILD OK -> dist/output + dist/output_resource'
            $html = Join-Path $root 'dist\output\index.html'
            if (Test-Path -LiteralPath $html) {
                $match = Select-String -LiteralPath $html -Pattern 'index-[A-Za-z0-9_-]+\.js' -AllMatches
                if ($match) { Write-Output ("ASSET: " + $match.Matches[0].Value) }
            }
        }
        else {
            Write-Output "BUILD FAILED (exit $LASTEXITCODE)"
        }
    }
}
finally {
    Pop-Location
}
