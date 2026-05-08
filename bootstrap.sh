#!/usr/bin/env bash
# Bootstrap completo do SuporteAgora ITSM em um Ubuntu Server zerado
# (somente OpenSSH instalado). Idempotente: rodar de novo é seguro.
#
# O que faz:
#   1. Atualiza o apt e instala utilitários (curl, git, ufw, openssl, ca-certs).
#   2. Instala Docker Engine + plugin Compose pelo repositório oficial.
#   3. Adiciona o usuário corrente ao grupo docker.
#   4. Habilita NTP (JWT depende de hora correta).
#   5. Clona/atualiza o repositório em /opt/suporteagora.
#   6. Configura UFW (libera SSH e a porta do frontend para a sub-rede).
#   7. Roda ./deploy.sh para gerar .env, segredos e subir a stack.
#
# Uso (na máquina Ubuntu, conectado via SSH com um usuário sudoer):
#
#   curl -fsSL <URL-DO-RAW-bootstrap.sh> -o bootstrap.sh
#   chmod +x bootstrap.sh
#   sudo REPO_URL=https://github.com/devotak-max/suporteagora.git \
#        REPO_BRANCH=claude/itsm-system-setup-dScpZ \
#        ALLOWED_CIDR=10.0.0.0/8 \
#        ./bootstrap.sh
#
# Variáveis de ambiente reconhecidas:
#   REPO_URL       (obrigatória se /opt/suporteagora ainda não existir)
#   REPO_BRANCH    branch a usar             (default: main)
#   INSTALL_DIR    onde clonar               (default: /opt/suporteagora)
#   APP_USER       dono dos arquivos         (default: $SUDO_USER ou $USER)
#   ALLOWED_CIDR   sub-rede liberada no UFW  (default: nenhum — libera 80 geral)
#   FRONTEND_PORT  porta HTTP publicada      (default: 80)
#   FRONTEND_HOST  hostname/IP do frontend   (default: IP detectado)
#   SKIP_FIREWALL  =1 não mexe no UFW
#   SKIP_DEPLOY    =1 não roda deploy.sh ao final

set -euo pipefail

# ------------------------------------------------------------------ utils
log()  { printf "\033[1;34m[boot ]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ ok  ]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn ]\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m[erro ]\033[0m %s\n" "$*" >&2; exit 1; }

# ------------------------------------------------------------------ root check
if [[ $EUID -ne 0 ]]; then
    die "Execute como root (use sudo). Ex.: sudo ./bootstrap.sh"
fi

# ------------------------------------------------------------------ vars
APP_USER="${APP_USER:-${SUDO_USER:-$USER}}"
INSTALL_DIR="${INSTALL_DIR:-/opt/suporteagora}"
REPO_BRANCH="${REPO_BRANCH:-main}"
FRONTEND_PORT="${FRONTEND_PORT:-80}"
ALLOWED_CIDR="${ALLOWED_CIDR:-}"
SKIP_FIREWALL="${SKIP_FIREWALL:-0}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"

[[ "$APP_USER" == "root" ]] && warn "Rodando como root sem SUDO_USER — defina APP_USER se quiser outro dono"

# ------------------------------------------------------------------ Ubuntu check
. /etc/os-release 2>/dev/null || die "/etc/os-release não encontrado"
[[ "${ID:-}" == "ubuntu" ]] || warn "Distro detectada: $ID — script foi pensado para Ubuntu"

# ------------------------------------------------------------------ 1. apt + utilidades
export DEBIAN_FRONTEND=noninteractive

log "Atualizando índice do apt"
apt-get update -y

log "Instalando utilitários básicos"
apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg lsb-release \
    git ufw openssl jq

ok "Utilitários instalados"

# ------------------------------------------------------------------ 2. Docker
if ! command -v docker >/dev/null 2>&1; then
    log "Instalando Docker Engine pelo repositório oficial"

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -y
    apt-get install -y \
        docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin

    systemctl enable --now docker
    ok "Docker instalado: $(docker --version)"
else
    ok "Docker já presente: $(docker --version)"
fi

# Garante o serviço ativo
systemctl is-active --quiet docker || systemctl start docker

# ------------------------------------------------------------------ 3. grupo docker
if id -nG "$APP_USER" | tr ' ' '\n' | grep -qx docker; then
    ok "$APP_USER já está no grupo docker"
else
    log "Adicionando $APP_USER ao grupo docker"
    usermod -aG docker "$APP_USER"
    warn "$APP_USER precisará reconectar SSH para usar docker sem sudo"
fi

# ------------------------------------------------------------------ 4. NTP
log "Habilitando sincronização de hora (NTP)"
if command -v timedatectl >/dev/null 2>&1; then
    timedatectl set-ntp true || warn "timedatectl set-ntp falhou — verifique manualmente"
    ok "NTP: $(timedatectl show -p NTPSynchronized --value 2>/dev/null || echo desconhecido)"
fi

# ------------------------------------------------------------------ 5. clone / update do repositório
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    [[ -n "${REPO_URL:-}" ]] || die "REPO_URL não definida e $INSTALL_DIR não é um repo git"
    log "Clonando $REPO_URL em $INSTALL_DIR (branch $REPO_BRANCH)"
    mkdir -p "$INSTALL_DIR"
    chown "$APP_USER":"$APP_USER" "$INSTALL_DIR"
    sudo -u "$APP_USER" git clone --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
else
    log "Repositório já presente em $INSTALL_DIR — atualizando"
    sudo -u "$APP_USER" git -C "$INSTALL_DIR" fetch --all --prune
    sudo -u "$APP_USER" git -C "$INSTALL_DIR" checkout "$REPO_BRANCH"
    sudo -u "$APP_USER" git -C "$INSTALL_DIR" pull --ff-only origin "$REPO_BRANCH" || \
        warn "git pull não foi fast-forward — resolva manualmente"
fi
ok "Código pronto em $INSTALL_DIR"

# ------------------------------------------------------------------ 6. UFW
if [[ "$SKIP_FIREWALL" != "1" ]]; then
    log "Configurando UFW"
    ufw allow OpenSSH >/dev/null

    if [[ -n "$ALLOWED_CIDR" ]]; then
        ufw allow from "$ALLOWED_CIDR" to any port "$FRONTEND_PORT" proto tcp >/dev/null
        ok "UFW: porta $FRONTEND_PORT/tcp liberada para $ALLOWED_CIDR"
    else
        warn "ALLOWED_CIDR não informado — liberando $FRONTEND_PORT/tcp para qualquer origem"
        ufw allow "$FRONTEND_PORT"/tcp >/dev/null
    fi

    if ! ufw status | grep -q "Status: active"; then
        log "Ativando UFW"
        echo "y" | ufw enable >/dev/null
    fi
    ok "UFW ativo:"
    ufw status numbered | sed 's/^/        /'
else
    warn "SKIP_FIREWALL=1 — pulando configuração do UFW"
fi

# ------------------------------------------------------------------ 7. deploy
if [[ "$SKIP_DEPLOY" == "1" ]]; then
    warn "SKIP_DEPLOY=1 — encerrando antes do deploy.sh"
    exit 0
fi

[[ -x "$INSTALL_DIR/deploy.sh" ]] || die "$INSTALL_DIR/deploy.sh não encontrado ou sem permissão de execução"

log "Executando deploy.sh como $APP_USER"
# Usa sg docker para que o usuário adquira o grupo docker imediatamente
# (sem precisar reconectar a sessão SSH).
DETECTED_HOST="${FRONTEND_HOST:-$(hostname -I 2>/dev/null | awk '{print $1}')}"

sudo -u "$APP_USER" \
    FRONTEND_HOST="$DETECTED_HOST" \
    sg docker -c "cd '$INSTALL_DIR' && ./deploy.sh"

# ------------------------------------------------------------------ resumo
IP_PUBLICO="$(hostname -I | awk '{print $1}')"
cat <<EOF

============================================================
 SuporteAgora ITSM — deploy concluído

 Acesse:    http://$IP_PUBLICO:$FRONTEND_PORT
 Diretório: $INSTALL_DIR
 Owner:     $APP_USER

 Comandos úteis (logue como $APP_USER):
   cd $INSTALL_DIR
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs -f backend
   ./deploy.sh --recreate     # recria containers (volumes preservados)

 Próximos passos sugeridos:
   1. Reconectar o SSH para que '$APP_USER' use 'docker' sem sudo.
   2. Criar o primeiro técnico em http://$IP_PUBLICO/ via /docs do backend
      (ou expor temporariamente a porta 8000 e usar POST /api/v1/auth/register).
   3. Configurar backup periódico do volume pgdata (cron + pg_dump).
============================================================
EOF
