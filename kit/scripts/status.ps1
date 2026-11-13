# status.ps1 - print the live state of all three ends (ASCII output only)
# usage: powershell -ExecutionPolicy Bypass -File .\kit\scripts\status.ps1
# Everything printed here is measured now. Documents may be stale; this is not.

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }
try { $OutputEncoding = [Text.Encoding]::UTF8 } catch { }

$Root  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Node  = $env:KILK_NODE
if (-not $Node) { $Node = 'C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe' }
$Git   = Join-Path $Root 'kit\private\tools\PortableGit\cmd\git.exe'
$PGBin = Join-Path $Root 'kit\private\tools\pg16\pgsql\bin'
$Srv   = '120.25.179.176'
$Site  = 'https://kilk.online'

$out = New-Object System.Collections.ArrayList
function W($s) { [void]$out.Add([string]$s) }
function Row($k, $v) { W ("  {0,-22} {1}" -f $k, $v) }
function Head($t) { W ''; W ("== $t ==") }

# PowerShell 5.1 decodes native stdout with the console code page (GBK here),
# which garbles Chinese commit messages. Read the raw bytes and decode as UTF-8.
function GitUtf8([string]$argLine) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Git
    $psi.Arguments = $argLine
    $psi.WorkingDirectory = $Root
    $psi.RedirectStandardOutput = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    try {
        $p = [System.Diagnostics.Process]::Start($psi)
        $ms = New-Object System.IO.MemoryStream
        $p.StandardOutput.BaseStream.CopyTo($ms)
        $p.WaitForExit()
        return [Text.Encoding]::UTF8.GetString($ms.ToArray()).Trim()
    } catch {
        return ''
    }
}

W 'kilk 2.0 - live status'
W ("checked at " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))

# ---------- local repo ----------
Head 'LOCAL REPO'
if (Test-Path $Git) {
    $branch = GitUtf8 'rev-parse --abbrev-ref HEAD'
    $head   = GitUtf8 'log -1 --pretty="%h %ad %s" --date=short'
    $dirtyRaw = GitUtf8 'status --short'
    $dirty  = @(($dirtyRaw -split "`r?`n") | Where-Object { $_ -ne '' })
    Row 'branch' $branch
    Row 'head' $head
    if ($dirty.Count -eq 0) { Row 'working tree' 'clean' }
    else {
        Row 'working tree' ("{0} changed file(s)" -f $dirty.Count)
        $dirty | Select-Object -First 8 | ForEach-Object { W ("      " + $_) }
    }
} else {
    Row 'git' ("MISSING: " + $Git)
}

# ---------- typecheck ----------
Head 'TYPECHECK'
if (Test-Path $Node) {
    Push-Location $Root
    $tscOut = @(& $Node 'node_modules\typescript\bin\tsc' -p tsconfig.app.json 2>&1)
    Pop-Location
    $errs = @($tscOut | Select-String 'error TS')
    if ($errs.Count -eq 0) { Row 'tsc errors' '0  (expected baseline)' }
    else {
        Row 'tsc errors' ("{0}  (baseline is 0 - investigate)" -f $errs.Count)
        $errs | Select-Object -First 5 | ForEach-Object { W ("      " + $_.Line.Trim()) }
    }
} else {
    Row 'node' ("MISSING: " + $Node)
}

# ---------- local build ----------
Head 'LOCAL BUILD'
$localFp = $null
$idx = Join-Path $Root 'dist\output\index.html'
if (Test-Path $idx) {
    $m = Select-String -Path $idx -Pattern 'index-[A-Za-z0-9_-]+\.js' | Select-Object -First 1
    if ($m) { $localFp = $m.Matches[0].Value }
    Row 'dist/output' ("built at " + (Get-Item $idx).LastWriteTime.ToString('yyyy-MM-dd HH:mm'))
    Row 'entry bundle' $localFp
    $assets = Join-Path $Root 'dist\output_resource\assets'
    if (Test-Path $assets) { Row 'assets dir' 'present' }
    else { Row 'assets dir' 'MISSING (deploy will white-screen)' }
    if ($localFp) {
        $bundle = Join-Path $assets $localFp
        if (Test-Path $bundle) {
            $txt = [IO.File]::ReadAllText($bundle)
            if ($txt -match 'PortableGit|file:///') {
                Row 'api base' 'BROKEN - rebuild with local-runtime\build.mjs'
            } elseif ($txt -match '=`/api`' -or $txt -match '="/api"') {
                Row 'api base' 'ok ("/api")'
            } else {
                Row 'api base' 'UNKNOWN - inspect bundle manually'
            }
        } else {
            Row 'api base' 'bundle not found'
        }
    }
} else {
    Row 'dist/output' 'not built yet'
}

# ---------- local services ----------
Head 'LOCAL SERVICES'
$ready = Join-Path $PGBin 'pg_isready.exe'
if (Test-Path $ready) {
    Row 'pg 5432' ((& $ready -h 127.0.0.1 -p 5432 2>&1) -join ' ')
} else {
    Row 'pg binaries' ("not found: " + $PGBin)
}
$be = $null
try { $be = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 3 -UseBasicParsing } catch { }
if ($be) { Row 'backend 3001' 'up' }
else { Row 'backend 3001' 'down (cd server; set DB_PASSWORD; node src/index.js)' }
$pv = $null
try { $pv = Invoke-WebRequest -Uri 'http://127.0.0.1:5180/' -TimeoutSec 3 -UseBasicParsing } catch { }
if ($pv) { Row 'preview 5180' 'up  http://127.0.0.1:5180' }
else { Row 'preview 5180' 'down (node local-runtime\server.mjs)' }

# ---------- server ----------
Head 'SERVER'
$health = $null
try { $health = (Invoke-WebRequest -Uri "$Site/api/health" -TimeoutSec 8 -UseBasicParsing).Content } catch { }
if ($health) {
    if ($health -match '"ok":true') { Row 'api/health' 'ok:true' } else { Row 'api/health' $health }
} else { Row 'api/health' 'NO RESPONSE' }

$onlineFp = $null
try {
    $html = (Invoke-WebRequest -Uri "$Site/" -TimeoutSec 8 -UseBasicParsing).Content
    $mm = [regex]::Match($html, 'index-[A-Za-z0-9_-]+\.js')
    if ($mm.Success) { $onlineFp = $mm.Value }
    Row 'online bundle' $onlineFp
} catch {
    Row 'online bundle' 'fetch failed'
}
if ($localFp -and $onlineFp) {
    if ($localFp -eq $onlineFp) { Row 'local vs online' 'IN SYNC' }
    else { Row 'local vs online' 'LOCAL AHEAD - frontend not deployed' }
}

$svc = @(& ssh -o BatchMode=yes -o ConnectTimeout=8 admin@$Srv 'systemctl is-active kilk2; systemctl show kilk2 -p NRestarts --value' 2>&1)
if ($svc.Count -ge 1 -and $svc[0] -match 'active|failed|inactive') {
    Row 'systemd kilk2' $svc[0]
    if ($svc.Count -ge 2) { Row 'restarts' $svc[1] }
} else {
    Row 'ssh' 'unreachable (offline or key issue)'
}

W ''
W 'Source of truth: AGENTS.md section 2. When they disagree, trust this output.'
W ''

[Console]::Out.Write((($out -join [Environment]::NewLine) + [Environment]::NewLine))
