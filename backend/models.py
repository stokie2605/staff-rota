from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type
from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint

class EmployeeBase(SQLModel):
    name: str
    role: str
    department: str
    grade: str                   # NHS Grades: 'Band 5 Nurse', 'Band 6 Nurse', 'Junior Doctor', 'Registrar', 'Consultant'
    is_locum: bool = False       # Flag to identify temporary contract/agency staff


class Employee(EmployeeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class EmployeeCreate(EmployeeBase):
    pass


class ShiftBase(SQLModel):
    date: date_type
    start_time: time_type
    end_time: time_type
    location: str
    required_grade: str          # Roster slot grade requirement (matches Employee.grade)
    offered_to_locum_pool: bool = False  # Set to True to page locum agency staff
    is_published: bool = False   # False = Draft mode, True = Live to staff


class Shift(ShiftBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class ShiftCreate(ShiftBase):
    pass


class ShiftAssignmentCreate(SQLModel):
    employee_id: int = Field(foreign_key="employee.id")
    shift_id: int = Field(foreign_key="shift.id")


class ShiftAssignment(ShiftAssignmentCreate, table=True):
    __table_args__ = (
        UniqueConstraint("employee_id", "shift_date", name="uix_employee_shift_date"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    shift_date: date_type = Field(index=True)
    shift_slot: str


class ShiftSwapRequest(SQLModel, table=True):
    __tablename__ = "shift_swap_requests"

    id: Optional[int] = Field(default=None, primary_key=True)
    requesting_employee_id: int = Field(foreign_key="employee.id")
    shift_id: int = Field(foreign_key="shift.id")
    target_employee_id: Optional[int] = Field(default=None, foreign_key="employee.id") # Optional target peer
    status: str = Field(default="PENDING")  # PENDING, APPROVED, DECLINED, SWAPPED
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: int | None = Field(default=None, primary_key=True, index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    action: str                        # e.g., "SHIFT_CREATED", "ASSIGNMENT_DELETED", "EMERGENCY_OVERRIDE"
    performed_by: str = Field(default="System")
    details: str                       # Description of changes
    reason_code: Optional[str] = None  # e.g., "SICKNESS", "LEAVE_COVER", "EMERGENCY_OVERRIDE"
    override_justification: Optional[str] = None  # 1-sentence manager justification for EWTD warnings

class AbsenceBase(SQLModel):
    employee_id: int = Field(foreign_key="employee.id")
    date: date_type
    reason: str  # e.g., "Annual Leave", "Sickness", "Training"

class Absence(AbsenceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class AbsenceCreate(AbsenceBase):
    pass