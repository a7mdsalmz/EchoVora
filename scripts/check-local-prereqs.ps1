$ErrorActionPreference = "Stop"

function Check-Port([string]$name, [int]$port) {
  try {
    $ok = (Test-NetConnection localhost -Port $port).TcpTestSucceeded
    if ($ok) { Write-Host "$name ($port): OK" } else { Write-Host "$name ($port): NOT RUNNING" }
  } catch {
    Write-Host "$name ($port): CHECK FAILED"
  }
}

Write-Host "Env files:"
Write-Host ("apps/api/.env: " + (Test-Path "apps/api/.env"))
Write-Host ("apps/worker/.env: " + (Test-Path "apps/worker/.env"))
Write-Host ("apps/web/.env.local: " + (Test-Path "apps/web/.env.local"))

Write-Host ""
Write-Host "Services:"
Check-Port "Postgres" 5432
Check-Port "Redis" 6379

