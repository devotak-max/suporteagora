from pydantic import BaseModel


class MonthlyReport(BaseModel):
    year: int
    month: int
    tickets_opened: int
    tickets_closed: int
    avg_resolution_minutes: float | None
    avg_resolution_hours: float | None
