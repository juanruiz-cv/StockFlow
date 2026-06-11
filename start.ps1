param(
  [switch]$SkipMigrations,
  [switch]$SkipSeeds
)

Write-Host "=== StockFlow - Inicio rápido ===" -ForegroundColor Cyan

# 1. Verificar PostgreSQL
$pg = Get-Service "postgresql*" -ErrorAction SilentlyContinue
if (-not $pg -or $pg.Status -ne 'Running') {
  Write-Host "⚠️  PostgreSQL no está corriendo. Ejecutalo primero." -ForegroundColor Yellow
  exit 1
}
Write-Host "✅ PostgreSQL corriendo" -ForegroundColor Green

# 2. Aplicar migrations SQL
if (-not $SkipMigrations) {
  Write-Host "→ Aplicando migrations..." -ForegroundColor Yellow
  $env:PGPASSWORD="stockflow_dev"
  Get-ChildItem "apps/api/src/database/migrations/*.sql" | Sort-Object Name | ForEach-Object {
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U stockflow -d stockflow -h localhost -f $_.FullName -q 2>&1 | Out-Null
  }
  Write-Host "✅ Migrations aplicadas" -ForegroundColor Green
}

# 3. Correr seeds (si no hay data)
if (-not $SkipSeeds) {
  $userCount = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U stockflow -d stockflow -h localhost -t -A -c "SELECT count(*) FROM users;" 2>$null
  if ($userCount -eq 0 -or $userCount -eq $null) {
    Write-Host "→ Sembrando datos iniciales..." -ForegroundColor Yellow
    npx ts-node -r tsconfig-paths/register apps/api/src/database/run-seeds.ts 2>&1
    Write-Host "✅ Seeds ejecutados" -ForegroundColor Green
  } else {
    Write-Host "✅ Data ya existe ($userCount usuarios)" -ForegroundColor Green
  }
}

# 4. Matar procesos viejos
Get-Process -Name "node*" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 5. Build API
Write-Host "→ Build API..." -ForegroundColor Yellow
npx nx build api 2>&1 | Out-Null
Write-Host "✅ API build OK" -ForegroundColor Green

# 6. Iniciar API (background)
Write-Host "→ Iniciando API en puerto 3000..." -ForegroundColor Yellow
Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "npx nx serve api"
Start-Sleep -Seconds 6

# 7. Iniciar Web (background)
Write-Host "→ Iniciando Web en puerto 4200..." -ForegroundColor Yellow
Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "npx nx serve web"
Start-Sleep -Seconds 8

# 8. Verificar
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  ✅ StockFlow LEVANTADO" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  API: http://localhost:3000/api" -ForegroundColor White
Write-Host "  Web: http://localhost:4200" -ForegroundColor White
Write-Host "  Login: admin@example.com / admin123" -ForegroundColor White
Write-Host "  Skill UI/UX: .opencode/skills/ui-ux-pro-max/" -ForegroundColor White
Write-Host "===========================================" -ForegroundColor Cyan
