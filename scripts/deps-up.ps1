$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Host "Docker is not available. Start PostgreSQL and Redis as local services, then continue."
  exit 1
}

docker compose up -d

