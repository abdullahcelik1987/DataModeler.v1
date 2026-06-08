param(
    [string]$ComposeService = "postgres",
    [string]$DbUser = "postgres",
    [string]$Database = "datamodeler",
    [string]$OutputDir = "database/logical-backup",
    [string]$Prefix = "datamodeler",
    [switch]$UpdateLatestAliases,
    [switch]$UpdateRootSchema
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker command not found in PATH."
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$schemaFile = Join-Path $OutputDir ("{0}-schema-{1}.sql" -f $Prefix, $timestamp)
$dataFile = Join-Path $OutputDir ("{0}-data-{1}.sql" -f $Prefix, $timestamp)

Write-Host "Exporting schema to $schemaFile"
docker compose exec -T $ComposeService pg_dump -U $DbUser -d $Database --schema-only --clean --if-exists --no-owner --no-privileges > $schemaFile
if ($LASTEXITCODE -ne 0) {
    throw "Schema export failed."
}

Write-Host "Exporting data (INSERT format) to $dataFile"
docker compose exec -T $ComposeService pg_dump -U $DbUser -d $Database --data-only --inserts --disable-triggers --no-owner --no-privileges > $dataFile
if ($LASTEXITCODE -ne 0) {
    throw "Data export failed."
}

if ($UpdateLatestAliases) {
    Copy-Item -LiteralPath $schemaFile -Destination (Join-Path $OutputDir "latest-schema.sql") -Force
    Copy-Item -LiteralPath $dataFile -Destination (Join-Path $OutputDir "latest-data.sql") -Force
    Write-Host "Updated latest aliases in $OutputDir"
}

if ($UpdateRootSchema) {
    Copy-Item -LiteralPath $schemaFile -Destination "database/schema.sql" -Force
    Write-Host "Updated database/schema.sql"
}

Write-Host "Logical export completed."
Write-Host "Schema: $schemaFile"
Write-Host "Data  : $dataFile"
