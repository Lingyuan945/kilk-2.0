# Verify the two remote links: GitHub (SSH) and production server (SSH).
# Usage: .\kit\scripts\verify-links.ps1

$ErrorActionPreference = 'Continue'
$ssh = 'C:\Windows\System32\OpenSSH\ssh.exe'
$ok = $true

Write-Output '=== 1) GitHub SSH ==='
$gh = & $ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15 -T git@github.com 2>&1 | Out-String
if ($gh -match 'successfully authenticated') {
    Write-Output 'GITHUB OK'
    Write-Output ($gh.Trim())
}
else {
    $ok = $false
    Write-Output 'GITHUB FAILED'
    Write-Output ($gh.Trim())
}

Write-Output ''
Write-Output '=== 2) Production server SSH ==='
$remote = 'hostname; whoami; systemctl is-active kilk2; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health'
$srv = & $ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15 admin@120.25.179.176 $remote 2>&1 | Out-String
Write-Output ($srv.Trim())
if ($srv -match 'active' -and $srv -match '200') {
    Write-Output 'SERVER OK (kilk2 active, /api/health 200)'
}
else {
    $ok = $false
    Write-Output 'SERVER CHECK FAILED'
}

Write-Output ''
if ($ok) { Write-Output 'ALL LINKS OK' } else { Write-Output 'SOME LINKS FAILED' }
exit $(if ($ok) { 0 } else { 1 })
