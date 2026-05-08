from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_staff
from app.db.session import get_db
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_comment import TicketComment
from app.models.user import User, UserRole
from app.schemas.ticket import (
    TicketAssign,
    TicketCommentCreate,
    TicketCommentRead,
    TicketCreate,
    TicketRead,
    TicketUpdate,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _is_staff(user: User) -> bool:
    return user.role in (UserRole.TECNICO, UserRole.ADMIN)


def _get_ticket_for_user(db: Session, ticket_id: int, user: User) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    if not _is_staff(user) and ticket.requester_id != user.id:
        raise HTTPException(status_code=403, detail="Acesso negado a este ticket")
    return ticket


@router.get("", response_model=list[TicketRead])
def list_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: TicketStatus | None = Query(default=None, alias="status"),
    assignee_id: int | None = None,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
) -> list[Ticket]:
    query = db.query(Ticket)

    if not _is_staff(current_user):
        query = query.filter(Ticket.requester_id == current_user.id)

    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if assignee_id is not None and _is_staff(current_user):
        query = query.filter(Ticket.assignee_id == assignee_id)

    return query.order_by(Ticket.opened_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Ticket:
    ticket = Ticket(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        category=payload.category,
        asset_id=payload.asset_id,
        requester_id=current_user.id,
        status=TicketStatus.ABERTO,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Ticket:
    return _get_ticket_for_user(db, ticket_id, current_user)


@router.patch("/{ticket_id}", response_model=TicketRead)
def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Ticket:
    ticket = _get_ticket_for_user(db, ticket_id, current_user)

    data = payload.model_dump(exclude_unset=True)

    if not _is_staff(current_user):
        # Cliente só pode editar título/descrição do próprio ticket enquanto estiver aberto.
        forbidden = {"status", "priority"} & data.keys()
        if forbidden:
            raise HTTPException(status_code=403, detail="Apenas técnicos podem alterar status/prioridade")
        if ticket.status != TicketStatus.ABERTO:
            raise HTTPException(status_code=400, detail="Ticket já está em atendimento")

    new_status = data.get("status")
    if new_status:
        if new_status == TicketStatus.EM_ATENDIMENTO and ticket.started_at is None:
            ticket.started_at = datetime.utcnow()
        if new_status in (TicketStatus.CONCLUIDO, TicketStatus.CANCELADO) and ticket.closed_at is None:
            ticket.closed_at = datetime.utcnow()
        if new_status == TicketStatus.ABERTO:
            ticket.closed_at = None

    for key, value in data.items():
        setattr(ticket, key, value)

    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/assign", response_model=TicketRead)
def assign_ticket(
    ticket_id: int,
    payload: TicketAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")

    assignee = db.get(User, payload.assignee_id)
    if not assignee or assignee.role not in (UserRole.TECNICO, UserRole.ADMIN):
        raise HTTPException(status_code=400, detail="Responsável precisa ser técnico ou admin")

    ticket.assignee_id = assignee.id
    if ticket.status == TicketStatus.ABERTO:
        ticket.status = TicketStatus.EM_ATENDIMENTO
        ticket.started_at = ticket.started_at or datetime.utcnow()

    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
) -> None:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    db.delete(ticket)
    db.commit()


@router.get("/{ticket_id}/comments", response_model=list[TicketCommentRead])
def list_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TicketComment]:
    ticket = _get_ticket_for_user(db, ticket_id, current_user)
    comments = ticket.comments
    if not _is_staff(current_user):
        comments = [c for c in comments if not c.is_internal]
    return comments


@router.post("/{ticket_id}/comments", response_model=TicketCommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(
    ticket_id: int,
    payload: TicketCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketComment:
    ticket = _get_ticket_for_user(db, ticket_id, current_user)
    if payload.is_internal and not _is_staff(current_user):
        raise HTTPException(status_code=403, detail="Apenas técnicos podem criar notas internas")

    comment = TicketComment(
        ticket_id=ticket.id,
        author_id=current_user.id,
        body=payload.body,
        is_internal=payload.is_internal,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
