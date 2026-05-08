from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_staff
from app.db.session import get_db
from app.models.user import User
from app.schemas.report import MonthlyReport
from app.services.reports import monthly_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/monthly", response_model=MonthlyReport)
def get_monthly_report(
    year: int = Query(default_factory=lambda: datetime.utcnow().year, ge=2000, le=2100),
    month: int = Query(default_factory=lambda: datetime.utcnow().month, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
) -> MonthlyReport:
    try:
        return monthly_report(db, year, month)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
