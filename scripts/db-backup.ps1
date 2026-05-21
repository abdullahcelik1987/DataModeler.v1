param(
    [string]$ContainerName = "datamodeler-postgres",
    [string]$DbUser = "postgres",
    [string]$Database = "datamodeler",
    [string]$OutputDir = "backups",
    [string]$FilePrefix = "datamodeler",
    [int]$KeepLast = 30
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker command not found in PATH."
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $OutputDir ("{0}-{1}.dump" -f $FilePrefix, $timestamp)
$backupMeta = Join-Path $OutputDir ("{0}-{1}.json" -f $FilePrefix, $timestamp)
$containerFile = "/tmp/{0}-{1}.dump" -f $FilePrefix, $timestamp

Write-Host "Creating backup: $backupFile"

# Use custom format (-Fc) for reliable restore with pg_restore.
docker exec -i $ContainerName pg_dump -U $DbUser -d $Database -Fc -f $containerFile | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Backup failed while creating dump inside container."
}

docker cp "$ContainerName`:$containerFile" "$backupFile" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Backup failed while copying dump file from container."
}

docker exec -i $ContainerName rm -f $containerFile | Out-Null

$fileInfo = Get-Item -LiteralPath $backupFile
if ($fileInfo.Length -eq 0) {
    throw "Backup file was created but is empty: $backupFile"
}

$metadata = [ordered]@{
    createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    container = $ContainerName
    database = $Database
    user = $DbUser
    format = "pg_dump custom"
    backupFile = [System.IO.Path]::GetFileName($backupFile)
    fileSizeBytes = $fileInfo.Length
}

$metadata | ConvertTo-Json | Set-Content -LiteralPath $backupMeta -Encoding UTF8

if ($KeepLast -gt 0) {
    $backups = Get-ChildItem -LiteralPath $OutputDir -Filter "$FilePrefix-*.dump" |
        Sort-Object LastWriteTime -Descending

    if ($backups.Count -gt $KeepLast) {
        $toDelete = $backups | Select-Object -Skip $KeepLast
        foreach ($item in $toDelete) {
            $metaFile = [System.IO.Path]::ChangeExtension($item.FullName, ".json")
            Remove-Item -LiteralPath $item.FullName -Force -ErrorAction SilentlyContinue
            if (Test-Path -LiteralPath $metaFile) {
                Remove-Item -LiteralPath $metaFile -Force -ErrorAction SilentlyContinue
            }
        }

        Write-Host ("Pruned old backups, kept latest {0}." -f $KeepLast)
    }
}

Write-Host "Backup completed successfully."
Write-Host "File: $backupFile"
