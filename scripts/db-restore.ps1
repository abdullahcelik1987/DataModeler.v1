param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$ContainerName = "datamodeler-postgres",
    [string]$DbUser = "postgres",
    [string]$Database = "datamodeler",
    [switch]$DropAndRecreate,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker command not found in PATH."
}

if (-not (Test-Path -LiteralPath $BackupFile)) {
    throw "Backup file not found: $BackupFile"
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$fileName = [System.IO.Path]::GetFileName($resolvedBackup)
$containerTmpPath = "/tmp/$fileName"

if (-not $Force) {
    $prompt = "Restore operation may overwrite data in '$Database'. Continue? (Y/N)"
    $answer = Read-Host $prompt
    if ($answer -notin @("Y", "y", "YES", "yes")) {
        Write-Host "Restore cancelled by user."
        exit 0
    }
}

Write-Host "Copying backup into container..."
docker cp "$resolvedBackup" "$ContainerName`:$containerTmpPath" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy backup file into container."
}

try {
    $ext = [System.IO.Path]::GetExtension($resolvedBackup).ToLowerInvariant()

    if ($ext -eq ".sql") {
        Write-Host "Restoring SQL backup with psql..."

        if ($DropAndRecreate) {
            docker exec -i $ContainerName psql -U $DbUser -d $Database -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to reset schema before SQL restore."
            }
        }

        docker exec -i $ContainerName psql -U $DbUser -d $Database -f $containerTmpPath
        if ($LASTEXITCODE -ne 0) {
            throw "SQL restore failed."
        }
    }
    else {
        Write-Host "Restoring pg_dump custom backup with pg_restore..."

        $restoreArgs = @("exec", "-i", $ContainerName, "pg_restore", "-U", $DbUser, "-d", $Database, "--no-owner", "--no-privileges")
        if ($DropAndRecreate) {
            $restoreArgs += @("--clean", "--if-exists")
        }
        $restoreArgs += $containerTmpPath

        & docker @restoreArgs
        if ($LASTEXITCODE -ne 0) {
            throw "pg_restore failed."
        }
    }
}
finally {
    docker exec -i $ContainerName rm -f $containerTmpPath | Out-Null
}

Write-Host "Restore completed successfully."
