# SuporteAgora ITSM

Sistema de ITSM para gestão de tickets, ativos (CMDB) e relatórios operacionais.

## Stack

- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0
- **Banco de Dados:** PostgreSQL 16
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Auth:** JWT (python-jose) + bcrypt (passlib)
- **Deploy:** Docker + Docker Compose

## Funcionalidades

- Autenticação JWT com perfis `CLIENTE`, `TECNICO` e `ADMIN`.
- CRUD de tickets com `status` (ABERTO / EM_ATENDIMENTO / CONCLUIDO / CANCELADO) e `prioridade` (BAIXA / MEDIA / ALTA / CRITICA).
- CMDB de ativos (IP, hostname, tipo, localização) vinculados aos tickets.
- Relatórios mensais: volume de chamados e tempo médio de resolução.

## Estrutura do Projeto

```
suporteagora/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Rotas FastAPI (auth, users, tickets, assets, reports)
│   │   ├── core/               # config.py, security.py (JWT/bcrypt)
│   │   ├── db/                 # base.py, session.py
│   │   ├── models/             # SQLAlchemy: user, asset, ticket, ticket_comment
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Regras de negócio (ex: relatórios)
│   │   ├── utils/
│   │   └── main.py
│   ├── alembic/                # Migrations
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/         # common, layout, tickets, assets, auth
│   │   ├── pages/              # Login, Dashboard, Tickets, Assets, Reports
│   │   ├── services/           # axios + api client
│   │   ├── hooks/
│   │   ├── context/            # AuthContext
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

## Como rodar (desenvolvimento)

```bash
docker compose up --build
```

- Backend: http://localhost:8000 (docs em `/docs`)
- Frontend: http://localhost:5173 (Vite com hot reload)
- Postgres: localhost:5432 (user: `itsm` / pass: `itsm`)

## Provisionar um Ubuntu Server zerado

Para instalar do zero numa VM/servidor Ubuntu que tem apenas OpenSSH, use o
`bootstrap.sh` (instala Docker, clona o repo, configura UFW/NTP e roda o deploy):

```bash
# Na máquina Ubuntu, conectado por SSH como usuário sudoer:
curl -fsSL https://raw.githubusercontent.com/devotak-max/suporteagora/claude/itsm-system-setup-dScpZ/bootstrap.sh \
  -o bootstrap.sh
chmod +x bootstrap.sh

sudo REPO_URL=https://github.com/devotak-max/suporteagora.git \
     REPO_BRANCH=claude/itsm-system-setup-dScpZ \
     ALLOWED_CIDR=10.0.0.0/8 \
     ./bootstrap.sh
```

Variáveis aceitas: `REPO_URL`, `REPO_BRANCH`, `INSTALL_DIR` (default `/opt/suporteagora`),
`APP_USER`, `ALLOWED_CIDR`, `FRONTEND_PORT`, `FRONTEND_HOST`,
`SKIP_FIREWALL=1`, `SKIP_DEPLOY=1`.

## Como rodar (produção)

Arquivos de produção:

- `backend/Dockerfile.prod` — multi-stage, gunicorn + uvicorn workers, usuário não-root, healthcheck.
- `frontend/Dockerfile.prod` — multi-stage (Node build → Nginx alpine), serve `dist/` estático e faz proxy reverso para o backend.
- `frontend/nginx.conf` — SPA fallback, gzip, cache imutável para `/assets/`, headers de segurança.
- `docker-compose.prod.yml` — orquestra `db`, `backend` e `frontend` com healthchecks, rede privada e volumes persistentes.

```bash
# Opção A — script automatizado (gera segredos, ajusta permissões e sobe)
./deploy.sh

# Opção B — manual
cp .env.prod.example .env
# edite .env e troque todas as senhas/segredos
chmod 600 .env
docker compose -f docker-compose.prod.yml up -d --build
```

O `deploy.sh` é idempotente: rodar de novo não regenera segredos já preenchidos,
apenas faz `build` e `up -d`. Argumentos úteis:

- `./deploy.sh --recreate` — derruba e recria os containers (volumes preservados).
- `./deploy.sh --logs` — segue o log do backend após subir.
- `FRONTEND_HOST=suporte.intranet.local ./deploy.sh` — sugere `CORS_ORIGINS` com esse host.

Acesse `http://<seu-host>` (porta 80). O frontend serve a SPA e faz proxy de `/api/*` para o backend, então **a API não fica exposta diretamente** — apenas o nginx é publicado.

### Persistência de dados

Os dados do PostgreSQL ficam no volume nomeado `pgdata` (driver `local`), montado em `/var/lib/postgresql/data`. Reinícios e recriação dos containers preservam tudo. Os logs do backend ficam no volume `backend_logs`.

```bash
# Inspecionar volumes
docker volume ls | grep suporteagora
docker volume inspect suporteagora_pgdata

# Backup do banco
docker compose -f docker-compose.prod.yml exec db \
    pg_dump -U itsm itsm > backup_$(date +%F).sql

# Restore
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db \
    psql -U itsm -d itsm
```

> Em produção, faça `alembic upgrade head` antes de subir o backend (ou troque o `create_all` por migrations no startup).
