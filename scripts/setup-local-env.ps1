$ErrorActionPreference = "Stop"

function New-B64([int]$bytes) {
  $b = New-Object byte[] $bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($b)
  return [Convert]::ToBase64String($b)
}

$jwt = New-B64 48
$ans = New-B64 48
$enc = New-B64 32

New-Item -ItemType Directory -Force -Path "apps/api","apps/worker","apps/web" | Out-Null

Set-Content -Path "apps/api/.env" -Value @(
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/echovora"'
  'REDIS_URL="redis://localhost:6379"'
  'PUBLIC_API_BASE_URL="http://localhost:4000"'
  ('CONFIG_ENCRYPTION_KEY="' + $enc + '"')
  'JWT_ISSUER="echovora"'
  'JWT_AUDIENCE="echovora-web"'
  'JWT_ACCESS_TOKEN_TTL_SECONDS="900"'
  'JWT_REFRESH_TOKEN_TTL_SECONDS="2592000"'
  ('JWT_SECRET="' + $jwt + '"')
  'DEFAULT_TELEPHONY_PROVIDER="twilio"'
  ('TELEPHONY_ANSWER_TOKEN_SECRET="' + $ans + '"')
)

Set-Content -Path "apps/worker/.env" -Value @(
  'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/echovora"'
  'REDIS_URL="redis://localhost:6379"'
  'API_BASE_URL="http://localhost:4000"'
  'SIMULATE_TELEPHONY="false"'
  ('CONFIG_ENCRYPTION_KEY="' + $enc + '"')
  ('TELEPHONY_ANSWER_TOKEN_SECRET="' + $ans + '"')
)

Set-Content -Path "apps/web/.env.local" -Value @(
  'NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"'
)

Write-Host "Created apps/api/.env, apps/worker/.env, apps/web/.env.local"
