import csv
import io
from datetime import date as date_type
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from database import create_db_and_tables, get_session
from models import Employee, EmployeeCreate, Shift, ShiftAssignment, ShiftAssignmentCreate, ShiftCreate

SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI(title="StaffRota API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


def parse_date(value: str) -> date_type:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Date must use YYYY-MM-DD format") from exc


def week_bounds(value: str) -> tuple[date_type, date_type]:
    selected = parse_date(value)
    start = selected - timedelta(days=selected.weekday())
    end = start + timedelta(days=6)
    return start, end


def assignment_detail(session: Session, assignment: ShiftAssignment) -> dict:
    employee = session.get(Employee, assignment.employee_id)
    shift = session.get(Shift, assignment.shift_id)
    return {
        "id": assignment.id,
        "employee_id": assignment.employee_id,
        "shift_id": assignment.shift_id,
        "employee_name": employee.name if employee else "Unknown employee",
        "employee_role": employee.role if employee else "",
        "department": employee.department if employee else "",
        "shift": {
            "id": shift.id if shift else None,
            "date": shift.date if shift else "",
            "start_time": shift.start_time if shift else "",
            "end_time": shift.end_time if shift else "",
            "location": shift.location if shift else "",
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/employees", response_model=Employee)
def create_employee(employee: EmployeeCreate, session: SessionDep) -> Employee:
    db_employee = Employee.model_validate(employee)
    session.add(db_employee)
    session.commit()
    session.refresh(db_employee)
    return db_employee


@app.get("/employees", response_model=list[Employee])
def list_employees(session: SessionDep) -> list[Employee]:
    return list(session.exec(select(Employee).order_by(Employee.name)).all())


@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, session: SessionDep) -> dict[str, str]:
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    assignments = session.exec(select(ShiftAssignment).where(ShiftAssignment.employee_id == employee_id)).all()
    for assignment in assignments:
        session.delete(assignment)
    session.delete(employee)
    session.commit()
    return {"status": "deleted"}


@app.post("/shifts", response_model=Shift)
def create_shift(shift: ShiftCreate, session: SessionDep) -> Shift:
    parse_date(shift.date)
    db_shift = Shift.model_validate(shift)
    session.add(db_shift)
    session.commit()
    session.refresh(db_shift)
    return db_shift


@app.get("/shifts", response_model=list[Shift])
def list_shifts(session: SessionDep) -> list[Shift]:
    return list(session.exec(select(Shift).order_by(Shift.date, Shift.start_time)).all())


@app.delete("/shifts/{shift_id}")
def delete_shift(shift_id: int, session: SessionDep) -> dict[str, str]:
    shift = session.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    assignments = session.exec(select(ShiftAssignment).where(ShiftAssignment.shift_id == shift_id)).all()
    for assignment in assignments:
        session.delete(assignment)
    session.delete(shift)
    session.commit()
    return {"status": "deleted"}


@app.post("/assignments")
def create_assignment(assignment: ShiftAssignmentCreate, session: SessionDep) -> dict:
    employee = session.get(Employee, assignment.employee_id)
    shift = session.get(Shift, assignment.shift_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    existing_assignments = session.exec(
        select(ShiftAssignment).where(ShiftAssignment.employee_id == assignment.employee_id)
    ).all()
    for existing in existing_assignments:
        existing_shift = session.get(Shift, existing.shift_id)
        if existing_shift and existing_shift.date == shift.date:
            raise HTTPException(
                status_code=400,
                detail="Conflict: Employee already assigned to a shift on this date",
            )

    db_assignment = ShiftAssignment.model_validate(assignment)
    session.add(db_assignment)
    session.commit()
    session.refresh(db_assignment)
    return assignment_detail(session, db_assignment)


@app.get("/assignments")
def list_assignments(session: SessionDep) -> list[dict]:
    assignments = session.exec(select(ShiftAssignment)).all()
    return [assignment_detail(session, assignment) for assignment in assignments]


@app.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, session: SessionDep) -> dict[str, str]:
    assignment = session.get(ShiftAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    session.delete(assignment)
    session.commit()
    return {"status": "deleted"}


@app.get("/rota/week")
def weekly_rota(date: str, session: SessionDep) -> dict:
    start, end = week_bounds(date)
    shifts = session.exec(select(Shift).order_by(Shift.date, Shift.start_time)).all()
    assignments = session.exec(select(ShiftAssignment)).all()

    week_days = []
    for offset in range(7):
        current = start + timedelta(days=offset)
        current_text = current.isoformat()
        day_shifts = []
        for shift in shifts:
            if shift.date != current_text:
                continue
            staff = []
            for assignment in assignments:
                if assignment.shift_id == shift.id:
                    employee = session.get(Employee, assignment.employee_id)
                    if employee:
                        staff.append(
                            {
                                "assignment_id": assignment.id,
                                "employee_id": employee.id,
                                "name": employee.name,
                                "role": employee.role,
                                "department": employee.department,
                            }
                        )
            day_shifts.append(
                {
                    "id": shift.id,
                    "date": shift.date,
                    "start_time": shift.start_time,
                    "end_time": shift.end_time,
                    "location": shift.location,
                    "staff": staff,
                }
            )
        week_days.append({"date": current_text, "day": current.strftime("%a"), "shifts": day_shifts})

    return {"week_start": start.isoformat(), "week_end": end.isoformat(), "days": week_days}


@app.get("/rota/export")
def export_rota(date: str, session: SessionDep) -> StreamingResponse:
    rota = weekly_rota(date, session)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Day", "Start", "End", "Location", "Employee", "Role", "Department"])

    for day in rota["days"]:
        for shift in day["shifts"]:
            if shift["staff"]:
                for employee in shift["staff"]:
                    writer.writerow(
                        [
                            day["date"],
                            day["day"],
                            shift["start_time"],
                            shift["end_time"],
                            shift["location"],
                            employee["name"],
                            employee["role"],
                            employee["department"],
                        ]
                    )
            else:
                writer.writerow(
                    [day["date"], day["day"], shift["start_time"], shift["end_time"], shift["location"], "", "", ""]
                )

    output.seek(0)
    filename = f"staffrota-{rota['week_start']}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
