"""CLI para criar usuários direto no banco.

Uso (com a stack em pé):

    docker compose -f docker-compose.prod.yml exec backend \
        python -m app.cli.create_user \
        --email admin@empresa.com \
        --name "Administrador" \
        --role ADMIN

Se --password for omitida, o script gera uma senha aleatória forte
e a imprime na tela (apenas uma vez).
"""

from __future__ import annotations

import argparse
import secrets
import string
import sys

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.user import User, UserRole


def generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria um usuário do ITSM")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True, help="Nome completo")
    parser.add_argument(
        "--role",
        choices=[r.value for r in UserRole],
        default=UserRole.TECNICO.value,
    )
    parser.add_argument("--password", help="Senha em texto puro (opcional — gera se vazio)")
    parser.add_argument("--company")
    parser.add_argument("--phone")
    parser.add_argument(
        "--update-password",
        action="store_true",
        help="Se o usuário já existir, atualiza a senha em vez de falhar",
    )
    args = parser.parse_args()

    # garante que as tabelas existam (idempotente)
    Base.metadata.create_all(bind=engine)

    password = args.password or generate_password()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == args.email).first()

        if existing and not args.update_password:
            print(f"[erro] Usuário {args.email} já existe (id={existing.id}).", file=sys.stderr)
            print("       Use --update-password para resetar a senha.", file=sys.stderr)
            return 2

        if existing:
            existing.hashed_password = hash_password(password)
            existing.full_name = args.name
            existing.role = UserRole(args.role)
            if args.company is not None:
                existing.company = args.company
            if args.phone is not None:
                existing.phone = args.phone
            user = existing
            action = "atualizado"
        else:
            user = User(
                full_name=args.name,
                email=args.email,
                hashed_password=hash_password(password),
                role=UserRole(args.role),
                company=args.company,
                phone=args.phone,
            )
            db.add(user)
            action = "criado"

        db.commit()
        db.refresh(user)
    finally:
        db.close()

    print(f"[ ok ] Usuário {action}:")
    print(f"       id:    {user.id}")
    print(f"       email: {user.email}")
    print(f"       role:  {user.role.value}")
    if not args.password:
        print()
        print(f"       Senha gerada: {password}")
        print("       (anote agora — não será exibida de novo)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
