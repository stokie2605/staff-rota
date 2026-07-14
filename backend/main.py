import csv
import io
from datetime import date as date_type
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from database import create_db_and_tables, get_session
from models import AuditLog, Employee, EmployeeCreate, Shift, ShiftAssignment, ShiftAssignmentCreate, ShiftCreate

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


from datetime import date as date_type
from datetime import time as time_type


def parse_date(value: str | date_type) -> date_type:
    if isinstance(value, date_type):
        return value
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Date must use YYYY-MM-DD format") from exc


def week_bounds(value: str) -> tuple[date_type, date_type]:
    selected = parse_date(value)
    start = selected - timedelta(days=selected.weekday())
    end = start + timedelta(days=6)
    return start, end


def shift_slot(shift: Shift) -> str:
    start = shift.start_time.strftime("%H:%M") if hasattr(shift.start_time, "strftime") else str(shift.start_time)
    end = shift.end_time.strftime("%H:%M") if hasattr(shift.end_time, "strftime") else str(shift.end_time)
    return f"{start}-{end}"


def assignment_detail(session: Session, assignment: ShiftAssignment) -> dict:
    employee = session.get(Employee, assignment.employee_id)
    shift = session.get(Shift, assignment.shift_id)
    
    shift_date_str = ""
    start_time_str = ""
    end_time_str = ""
    
    if shift:
        shift_date_str = shift.date.isoformat() if hasattr(shift.date, "isoformat") else str(shift.date)
        start_time_str = shift.start_time.strftime("%H:%M") if hasattr(shift.start_time, "strftime") else str(shift.start_time)
        end_time_str = shift.end_time.strftime("%H:%M") if hasattr(shift.end_time, "strftime") else str(shift.end_time)

    return {
        "id": assignment.id,
        "employee_id": assignment.employee_id,
        "shift_id": assignment.shift_id,
        "employee_name": employee.name if employee else "Unknown employee",
        "employee_role": employee.role if employee else "",
        "department": employee.department if employee else "",
        "shift": {
            "id": shift.id if shift else None,
            "date": shift_date_str,
            "start_time": start_time_str,
            "end_time": end_time_str,
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
    
    # Save the details for our log before the employee is deleted from the DB
    employee_name = employee.name
    employee_role = employee.role
    
    assignments = session.exec(select(ShiftAssignment).where(ShiftAssignment.employee_id == employee_id)).all()
    for assignment in assignments:
        session.delete(assignment)
        
    session.delete(employee)

    # Insert the new operational log entry
    audit_log = AuditLog(
        action="EMPLOYEE_DELETED",
        performed_by="Admin",
        details=f"Deleted employee {employee_name} ({employee_role}) and removed all associated shift assignments."
    )
    session.add(audit_log)
    
    # Save all database changes together
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

    db_assignment = ShiftAssignment(
        employee_id=assignment.employee_id,
        shift_id=assignment.shift_id,
        shift_date=shift.date,
        shift_slot=shift_slot(shift),
    )
    session.add(db_assignment)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Conflict: Employee already assigned to a shift on this date",
        ) from exc
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
        
    # Gather clear context for the audit log before removing records
    employee = session.get(Employee, assignment.employee_id)
    shift = session.get(Shift, assignment.shift_id)
    
    emp_name = employee.name if employee else "Unknown Employee"
    shift_date_str = shift.date.isoformat() if shift and hasattr(shift.date, "isoformat") else (shift.date if shift else "")
    start_time_str = shift.start_time.strftime("%H:%M") if shift and hasattr(shift.start_time, "strftime") else (shift.start_time if shift else "")
    end_time_str = shift.end_time.strftime("%H:%M") if shift and hasattr(shift.end_time, "strftime") else (shift.end_time if shift else "")
    shift_info = f"{shift_date_str} ({start_time_str}-{end_time_str})" if shift else "Unknown Shift"

    session.delete(assignment)

    # Log the action
    audit_log = AuditLog(
        action="ASSIGNMENT_DELETED",
        performed_by="Admin",
        details=f"Removed {emp_name} from their scheduled shift on {shift_info}."
    )
    session.add(audit_log)
    session.commit()
    return {"status": "deleted"}


@app.get("/audit-logs", response_model=list[AuditLog])
def list_audit_logs(session: SessionDep) -> list[AuditLog]:
    return list(session.exec(select(AuditLog).order_by(AuditLog.timestamp.desc())).all())


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
            if shift.date != current:
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
                    "date": shift.date.isoformat() if hasattr(shift.date, "isoformat") else str(shift.date),
                    "start_time": shift.start_time.strftime("%H:%M") if hasattr(shift.start_time, "strftime") else str(shift.start_time),
                    "end_time": shift.end_time.strftime("%H:%M") if hasattr(shift.end_time, "strftime") else str(shift.end_time),
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