from calendar import monthrange
from datetime import datetime

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.ticket import Ticket, TicketStatus
from app.schemas.report import MonthlyReport


def monthly_report(db: Session, year: int, month: int) -> MonthlyReport:
    if month < 1 or month > 12:
        raise ValueError("Mês inválido")

    start = datetime(year, month, 1)
    last_day = monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59)

    tickets_opened = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.opened_at.between(start, end))
        .scalar()
        or 0
    )

    tickets_closed = (
        db.query(func.count(Ticket.id))
        .filter(
            and_(
                Ticket.status == TicketStatus.CONCLUIDO,
                Ticket.closed_at.isnot(None),
                Ticket.closed_at.between(start, end),
            )
        )
        .scalar()
        or 0
    )

    avg_seconds = (
        db.query(
            func.avg(
                func.extract("epoch", Ticket.closed_at - Ticket.opened_at)
            )
        )
        .filter(
            and_(
                Ticket.status == TicketStatus.CONCLUIDO,
                Ticket.closed_at.isnot(None),
                Ticket.closed_at.between(start, end),
            )
        )
        .scalar()
    )

    avg_minutes = round(avg_seconds / 60, 2) if avg_seconds is not None else None
    avg_hours = round(avg_seconds / 3600, 2) if avg_seconds is not None else None

    return MonthlyReport(
        year=year,
        month=month,
        tickets_opened=tickets_opened,
        tickets_closed=tickets_closed,
        avg_resolution_minutes=avg_minutes,
        avg_resolution_hours=avg_hours,
    )
