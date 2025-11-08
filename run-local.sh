#!/usr/bin/env bash
set -euo pipefail

REPO_URL="");/""
REPO_DIR="bavaria-booking"

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker ist nicht installiert oder nicht in PATH. Bitte installiere Docker Desktop oder Docker Engine."
  exit 1
fi

# Detect docker compose command (docker compose (v2+) or docker-compose)
DC_CMD=""
if command -v docker-compose >/dev/null 2>&1; then
  DC_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DC_CMD="docker compose"
else
  echo "Kein 'docker compose' oder 'docker-compose' gefunden. Bitte stelle sicher, dass Docker Compose verfügbar ist."
  exit 1
fi

# If a repo URL is provided, clone or update the target directory and cd into it
if [[ -n "$REPO_URL" ]]; then
  if [[ -d "$REPO_DIR" ]]; then
    echo "Verzeichnis '$REPO_DIR' existiert bereits — versuche Pull..."
    (cd "$REPO_DIR" && git pull --ff-only) || true
  else
    echo "Klone Repository: $REPO_URL -> $REPO_DIR"
    git clone "$REPO_URL" "$REPO_DIR"
  fi
  cd "$REPO_DIR"
fi

# If this script is run inside a different path, try to find project root (where docker-compose.yml is)
if [[ ! -f docker-compose.yml && ! -f docker-compose.yaml ]]; then
  # Search up to 3 parent levels for a compose file
  SEARCH_DIR="$(pwd)"
  FOUND=0
  for i in 1 2 3; do
    if [[ -f "$SEARCH_DIR/../docker-compose.yml" || -f "$SEARCH_DIR/../docker-compose.yaml" ]]; then
      cd "$SEARCH_DIR/.."
      FOUND=1
      break
    fi
    SEARCH_DIR="$SEARCH_DIR/.."
  done
  if [[ $FOUND -eq 0 ]]; then
    echo "Keine docker-compose.yml/.yaml im aktuellen Verzeichnis oder in den Elternverzeichnissen gefunden."
    echo "Wenn du das Repository noch nicht geklont hast, rufe das Skript mit der Repo-URL auf, z.B.:"
    echo "  ./run-local.sh https://github.com/skiniger/bavaria-booking.git"
    exit 1
  fi
fi

# Copy .env.example to .env if present and .env missing
if [[ -f .env.example && ! -f .env ]]; then
  echo "Erstelle .env aus .env.example (prüfe sensible Werte vor dem Start)."
  cp .env.example .env || true
fi

echo "Starte Backend + Frontend + PostgreSQL via Docker Compose..."
$DC_CMD up -d --build

echo
echo "Fertig. Öffne folgende URLs im Browser:"
echo "- Frontend:      http://localhost:5173"
echo "- Backend Admin: http://localhost:8000/admin   (admin/admin123)"
echo "- API:           http://localhost:8000/api"

echo
echo "Nützliche Befehle:"
echo "- Logs verfolgen: $DC_CMD logs -f"
echo "- Stoppen:        $DC_CMD down"

echo "Hinweis: Bitte ändere das Standard-Admin-Passwort vor dem Produktiveinsatz."