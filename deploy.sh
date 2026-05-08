#!/usr/bin/env bash
# Script de deploy do SuporteAgora ITSM em servidor Ubuntu.
# - Gera .env a partir de .env.prod.example se não existir.
# - Preenche segredos (POSTGRES_PASSWORD e JWT_SECRET_KEY) caso estejam vazios.
# - Calcula GUNICORN_WORKERS com base em nproc.
# - Aplica chmod 600 no .env.
# - Sobe a stack com docker-compose.prod.yml.
#
# Uso:
#   ./deploy.sh                # primeiro deploy ou atualização da stack
#   ./deploy.sh --recreate     # recria os containers (down + up)
#   ./deploy.sh --logs         # tail dos logs do backend após o up
#   FRONTEND_HOST=10.0.5.20 ./deploy.sh   # ajusta CORS_ORIGINS automaticamente

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env"
ENV_EXAMPLE=".env.prod.example"
COMPOSE_FILE="docker-compose.prod.yml"

RECREATE=0
TAIL_LOGS=0
for arg in "$@"; do
    case "$arg" in
        --recreate) RECREATE=1 ;;
        --logs) TAIL_LOGS=1 ;;
        -h|--help)
            grep -E '^# ' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "Argumento desconhecido: $arg" >&2; exit 2 ;;
    esac
done

log()  { printf "\033[1;34m[deploy]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ ok  ]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn ]\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m[erro ]\033[0m %s\n" "$*" >&2; exit 1; }

# --- Pré-requisitos ---
require() { command -v "$1" >/dev/null 2>&1 || die "comando '$1' não encontrado"; }
require docker
require openssl
require awk
if docker compose version >/dev/null 2>&1; then
    DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    DC=(docker-compose)
else
    die "docker compose / docker-compose não encontrado"
fi

[[ -f "$COMPOSE_FILE" ]] || die "$COMPOSE_FILE não encontrado neste diretório"
[[ -f "$ENV_EXAMPLE"  ]] || die "$ENV_EXAMPLE não encontrado neste diretório"

# --- Geradores ---
gen_password() { openssl rand -base64 32 | tr -d '/+=' | cut -c1-32; }
gen_jwt()      { openssl rand -hex 64; }

calc_workers() {
    local cpus
    cpus="$(nproc 2>/dev/null || echo 1)"
    echo $((2 * cpus + 1))
}

detect_origin() {
    if [[ -n "${FRONTEND_HOST:-}" ]]; then
        echo "$FRONTEND_HOST"
        return
    fi
    hostname -I 2>/dev/null | awk '{print $1}'
}

# Atualiza KEY=VAL no .env. Se a chave não existir, adiciona ao final.
upsert_env() {
    local key="$1" value="$2" file="$3"
    if grep -qE "^${key}=" "$file"; then
        local escaped
        escaped="$(printf '%s' "$value" | sed -e 's/[\/&|]/\\&/g')"
        sed -i "s|^${key}=.*|${key}=${escaped}|" "$file"
    else
        printf '%s=%s\n' "$key" "$value" >> "$file"
    fi
}

# Lê o valor atual de uma chave (sem aspas externas)
read_env() {
    local key="$1" file="$2"
    awk -F= -v k="$key" '$1==k{sub(/^[^=]+=/,""); print; exit}' "$file"
}

# --- Bootstrap do .env ---
if [[ ! -f "$ENV_FILE" ]]; then
    log "Criando $ENV_FILE a partir de $ENV_EXAMPLE"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

CURRENT_PG="$(read_env POSTGRES_PASSWORD "$ENV_FILE" || true)"
if [[ -z "$CURRENT_PG" || "$CURRENT_PG" == "trocar-por-senha-forte" ]]; then
    NEW_PG="$(gen_password)"
    upsert_env POSTGRES_PASSWORD "$NEW_PG" "$ENV_FILE"
    ok "POSTGRES_PASSWORD gerada (32 chars)"
else
    ok "POSTGRES_PASSWORD já definida — mantida"
fi

CURRENT_JWT="$(read_env JWT_SECRET_KEY "$ENV_FILE" || true)"
if [[ -z "$CURRENT_JWT" || "$CURRENT_JWT" == "trocar-por-uma-chave-aleatoria-com-pelo-menos-64-chars" ]]; then
    NEW_JWT="$(gen_jwt)"
    upsert_env JWT_SECRET_KEY "$NEW_JWT" "$ENV_FILE"
    ok "JWT_SECRET_KEY gerada (128 hex)"
else
    ok "JWT_SECRET_KEY já definida — mantida"
fi

CURRENT_WORKERS="$(read_env GUNICORN_WORKERS "$ENV_FILE" || true)"
if [[ -z "$CURRENT_WORKERS" ]]; then
    upsert_env GUNICORN_WORKERS "$(calc_workers)" "$ENV_FILE"
    ok "GUNICORN_WORKERS = $(calc_workers) (com base em nproc)"
fi

# CORS_ORIGINS — só sugere se ainda estiver no default do exemplo
CURRENT_CORS="$(read_env CORS_ORIGINS "$ENV_FILE" || true)"
if [[ "$CURRENT_CORS" == '["https://suporte.suaempresa.com"]' || -z "$CURRENT_CORS" ]]; then
    HOST_IP="$(detect_origin)"
    if [[ -n "$HOST_IP" ]]; then
        SUGGESTED="[\"http://${HOST_IP}\"]"
        upsert_env CORS_ORIGINS "$SUGGESTED" "$ENV_FILE"
        warn "CORS_ORIGINS preenchido com $SUGGESTED"
        warn "  Edite manualmente se houver DNS interno ou HTTPS:"
        warn "  ex.: CORS_ORIGINS=[\"http://suporte.intranet.local\",\"http://${HOST_IP}\"]"
    fi
fi

chmod 600 "$ENV_FILE"
ok "Permissões do $ENV_FILE = 600"

# --- Validações finais ---
for key in POSTGRES_PASSWORD JWT_SECRET_KEY CORS_ORIGINS VITE_API_URL; do
    val="$(read_env "$key" "$ENV_FILE" || true)"
    [[ -n "$val" ]] || die "$key vazio no $ENV_FILE"
done

# --- Subida da stack ---
log "Construindo imagens..."
"${DC[@]}" -f "$COMPOSE_FILE" build --pull

if [[ $RECREATE -eq 1 ]]; then
    log "Recreate solicitado: derrubando containers (volumes preservados)"
    "${DC[@]}" -f "$COMPOSE_FILE" down
fi

log "Subindo containers em background..."
"${DC[@]}" -f "$COMPOSE_FILE" up -d

log "Status:"
"${DC[@]}" -f "$COMPOSE_FILE" ps

cat <<EOF

------------------------------------------------------------
Deploy concluído.

  Frontend:  http://$(hostname -I | awk '{print $1}'):$(read_env FRONTEND_HTTP_PORT "$ENV_FILE")
  Logs:      ${DC[*]} -f $COMPOSE_FILE logs -f backend
  Status:    ${DC[*]} -f $COMPOSE_FILE ps
  Stop:      ${DC[*]} -f $COMPOSE_FILE down
  Backup DB: ${DC[*]} -f $COMPOSE_FILE exec db pg_dump -U $(read_env POSTGRES_USER "$ENV_FILE") $(read_env POSTGRES_DB "$ENV_FILE") > backup_\$(date +%F).sql
------------------------------------------------------------
EOF

if [[ $TAIL_LOGS -eq 1 ]]; then
    "${DC[@]}" -f "$COMPOSE_FILE" logs -f backend
fi
