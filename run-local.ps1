Param(
    [string]$RepoUrl = "REPO_URL_HIER_EINFUEGEN"
)

$RepoDir = "bavaria-booking"

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker nicht gefunden. Bitte Docker Desktop (Windows) installieren und starten."
    exit 1
}

# Detect docker compose command
dcCmd = $null
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $dcCmd = 'docker-compose'
} else {
    try {
        $null = & docker compose version 2>$null
        $dcCmd = 'docker compose'
    } catch {
        Write-Error "Kein 'docker compose' oder 'docker-compose' gefunden. Stelle sicher, dass Docker Compose verfügbar ist."
        exit 1
    }
}

# Clone or update repository if RepoUrl provided
if ($RepoUrl -ne "REPO_URL_HIER_EINFUEGEN" -and $RepoUrl -ne "") {
    if (-not (Test-Path -Path $RepoDir)) {
        Write-Host "Klone Repository: $RepoUrl -> $RepoDir"
        git clone $RepoUrl $RepoDir
        if ($LASTEXITCODE -ne 0) { Write-Error "git clone fehlgeschlagen"; exit 1 }
    } else {
        Write-Host "Verzeichnis '$RepoDir' existiert bereits — führe git pull aus..."
        Push-Location $RepoDir
        git pull --ff-only || Write-Host "git pull konnte nicht automatisch durchgeführt werden"
        Pop-Location
    }
    Set-Location $RepoDir
}

# Try to find docker-compose.yml in current or parent directories
if (-not (Test-Path -Path "docker-compose.yml") -and -not (Test-Path -Path "docker-compose.yaml")) {
    $found = $false
    $searchDir = Get-Location
    for ($i = 0; $i -lt 4; $i++) {
        if (Test-Path -Path (Join-Path $searchDir.Path 'docker-compose.yml') -PathType Leaf -ErrorAction SilentlyContinue -or Test-Path -Path (Join-Path $searchDir.Path 'docker-compose.yaml') -PathType Leaf -ErrorAction SilentlyContinue) {
            Set-Location $searchDir.Path
            $found = $true
            break
        }
        if ($null -eq $searchDir.Parent) { break }
        $searchDir = $searchDir.Parent
    }
    if (-not $found) {
        Write-Error "Keine docker-compose.yml/.yaml im aktuellen Verzeichnis oder in den Elternverzeichnissen gefunden."
        Write-Host "Aufruf-Beispiel: .\run-local.ps1 'https://github.com/skiniger/bavaria-booking.git'"
        exit 1
    }
}

# Copy .env.example -> .env if present
if (Test-Path -Path '.env.example' -PathType Leaf -and -not (Test-Path -Path '.env' -PathType Leaf)) {
    Write-Host "Erstelle .env aus .env.example (prüfe sensible Werte vor dem Start)."
    Copy-Item -Path .env.example -Destination .env -Force
}

Write-Host "Starte Backend + Frontend + PostgreSQL via Docker Compose..."
& $dcCmd up -d --build

Write-Host ""
Write-Host "Fertig. Öffne folgende URLs im Browser:"
Write-Host "- Frontend:      http://localhost:5173"
Write-Host "- Backend Admin: http://localhost:8000/admin   (admin/admin123)"
Write-Host "- API:           http://localhost:8000/api"
Write-Host ""
Write-Host "Nützliche Befehle:"
Write-Host "- Logs verfolgen: $dcCmd logs -f"
Write-Host "- Stoppen:        $dcCmd down"
Write-Host "Hinweis: Bitte ändere das Standard-Admin-Passwort vor dem Produktiveinsatz."
