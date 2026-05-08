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

## Como rodar

```bash
docker compose up --build
```

- Backend: http://localhost:8000 (docs em `/docs`)
- Frontend: http://localhost:5173
- Postgres: localhost:5432 (user: `itsm` / pass: `itsm`)
