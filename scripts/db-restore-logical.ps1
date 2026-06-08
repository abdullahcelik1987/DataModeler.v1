param(
    [string]$ComposeService = "postgres",
    [string]$DbUser = "postgres",
    [string]$Database = "datamodeler",
    [string]$SchemaFile = "database/logical-backup/latest-schema.sql",
    [string]$DataFile = "database/logical-backup/latest-data.sql",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker command not found in PATH."
}

if (-not (Test-Path -LiteralPath $SchemaFile)) {
    throw "Schema file not found: $SchemaFile"
}

if (-not (Test-Path -LiteralPath $DataFile)) {
    throw "Data file not found: $DataFile"
}

if (-not $Force) {
    $answer = Read-Host "This will overwrite schema/data in '$Database'. Continue? (Y/N)"
    if ($answer -notin @("Y", "y", "YES", "yes")) {
        Write-Host "Restore cancelled by user."
        exit 0
    }
}

$schemaResolved = (Resolve-Path -LiteralPath $SchemaFile).Path
$dataResolved = (Resolve-Path -LiteralPath $DataFile).Path

$schemaName = [System.IO.Path]::GetFileName($schemaResolved)
$dataName = [System.IO.Path]::GetFileName($dataResolved)
$schemaContainerPath = "/tmp/$schemaName"
$dataContainerPath = "/tmp/$dataName"

try {
    Write-Host "Copying logical backup files into container..."
    docker compose cp $schemaResolved "${ComposeService}:$schemaContainerPath" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to copy schema file into container."
    }

    docker compose cp $dataResolved "${ComposeService}:$dataContainerPath" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to copy data file into container."
    }

    Write-Host "Restoring schema..."
    docker compose exec -T $ComposeService psql -U $DbUser -d $Database -v ON_ERROR_STOP=1 -f $schemaContainerPath
    if ($LASTEXITCODE -ne 0) {
        throw "Schema restore failed."
    }

    Write-Host "Restoring data..."
    docker compose exec -T $ComposeService psql -U $DbUser -d $Database -v ON_ERROR_STOP=1 -f $dataContainerPath
    if ($LASTEXITCODE -ne 0) {
        throw "Data restore failed."
    }
}
finally {
    docker compose exec -T $ComposeService rm -f $schemaContainerPath | Out-Null
    docker compose exec -T $ComposeService rm -f $dataContainerPath | Out-Null
}

Write-Host "Logical restore completed successfully."
