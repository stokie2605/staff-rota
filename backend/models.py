from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class EmployeeBase(SQLModel):
    name: str
    role: str
    department: str


class Employee(EmployeeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class EmployeeCreate(EmployeeBase):
    pass


class ShiftBase(SQLModel):
    date: str
    start_time: str
    end_time: str
    location: str


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
    shift_date: str = Field(index=True)
    shift_slot: str
