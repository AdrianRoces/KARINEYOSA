Param(
    [string]$DbPath
)

# Helper script to backup the SQLite DB and run the non-destructive cleanup SQL.
# By default this script only creates a timestamped file backup and then executes
# `db/cleanup.sql` which itself only creates internal backup tables and leaves
# DROP statements commented out. This script will NOT drop tables unless you
# explicitly modify `db/cleanup.sql` to uncomment DROP lines and rerun.

$scriptDir = Split-Path -Parent $PSCommandPath

if (-not $DbPath) {
    Write-Host "Searching for sia102.db under the current directory..."
    $found = Get-ChildItem -Path (Get-Location) -Recurse -Filter 'sia102.db' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $DbPath = $found.FullName
        Write-Host "Found DB: $DbPath"
    }
}

if (-not $DbPath -or -not (Test-Path $DbPath)) {
    $DbPath = Read-Host "Enter path to sia102.db (absolute or relative)"
    if (-not (Test-Path $DbPath)) {
        Write-Host "DB not found. Aborting."; exit 1
    }
}

# Check if backend port 5231 is listening to avoid concurrent writes
try {
    $portInUse = Get-NetTCPConnection -State Listen -LocalPort 5231 -ErrorAction SilentlyContinue
} catch {
    $portInUse = $null
}

if ($portInUse) {
    Write-Host "Warning: found a process listening on port 5231. Please stop the backend (dotnet) before proceeding." -ForegroundColor Yellow
    $yes = Read-Host "Have you stopped the backend? (y/N)"
    if ($yes -ne 'y' -and $yes -ne 'Y') { Write-Host "Aborting. Stop the backend and re-run."; exit 1 }
}

$backupDir = Join-Path (Split-Path $DbPath -Parent) "db-backups"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $backupDir ("sia102_" + $timestamp + ".db")
Copy-Item -Path $DbPath -Destination $backupPath -Force
Write-Host "Backup created at: $backupPath"

# Locate cleanup SQL (repo-relative)
$cleanupSqlCandidates = @(
    Join-Path $scriptDir "..\db\cleanup.sql",
    Join-Path (Get-Location) "db\cleanup.sql",
    Join-Path $scriptDir "db\cleanup.sql"
)

$cleanupSql = $cleanupSqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $cleanupSql) {
    Write-Host "db/cleanup.sql not found in expected locations. Please create db/cleanup.sql and re-run." -ForegroundColor Yellow
    exit 0
}

# Prefer sqlite3 CLI if available
$sqliteCmd = Get-Command sqlite3 -ErrorAction SilentlyContinue
if ($sqliteCmd) {
    Write-Host "Running non-destructive cleanup SQL against $DbPath..."
    & sqlite3 $DbPath ".read '$cleanupSql'"
    Write-Host "Cleanup SQL executed. The script is non-destructive by default (DROPs are commented)."
    Write-Host "Please inspect 'backup_' tables and verify before uncommenting any DROP statements." -ForegroundColor Green
} else {
    Write-Host "sqlite3 not found on PATH. To run the SQL manually, install sqlite3 or run:" -ForegroundColor Yellow
    Write-Host "sqlite3 '$DbPath' \".read $cleanupSql\""
}

Write-Host "Done. If you need me to proceed with permanent DROP statements, reply here to confirm and provide a verified backup path." -ForegroundColor Cyan
