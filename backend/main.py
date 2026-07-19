import csv
import io
from datetime import date as date_type
from datetime import datetime, timedelta
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, SQLModel

from database import create_db_and_tables, get_session
from models import AuditLog, Employee, EmployeeCreate, Shift, ShiftAssignment, ShiftCreate, ShiftSwapRequest, Absence, AbsenceCreate
from compliance import check_11hr_rest_compliance, check_48hr_weekly_compliance, check_grade_compliance, check_absence_compliance

SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI(title="StaffRota API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://staff-rota-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


class PublishRequest(SQLModel):
    start_date: str
    end_date: str

class AssignmentRequest(SQLModel):
    employee_id: int
    shift_id: int
    ignore_warnings: bool = False
    reason_code: Optional[str] = "ROSTER_ADJUSTMENT"
    override_justification: Optional[str] = None


class SwapCreateRequest(SQLModel):
    requesting_employee_id: int
    shift_id: int
    target_employee_id: Optional[int] = None


class SwapApprovalRequest(SQLModel):
    target_employee_id: int
    ignore_warnings: bool = False
    reason_code: Optional[str] = "EMERGENCY_OVERRIDE"
    override_justification: Optional[str] = None


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
        "employee_grade": employee.grade if employee else "",
        "department": employee.department if employee else "",
        "shift": {
            "id": shift.id if shift else None,
            "date": shift_date_str,
            "start_time": start_time_str,
            "end_time": end_time_str,
            "location": shift.location if shift else "",
            "required_grade": shift.required_grade if shift else ""
        },
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/rota/seed")
def trigger_seed() -> dict:
    from seed import run_seed
    try:
        run_seed()
        return {"status": "success", "message": "NHS compliance seed data created successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



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
    
    employee_name = employee.name
    employee_role = employee.role
    
    assignments = session.exec(select(ShiftAssignment).where(ShiftAssignment.employee_id == employee_id)).all()
    for assignment in assignments:
        session.delete(assignment)
        
    session.delete(employee)

    audit_log = AuditLog(
        action="EMPLOYEE_DELETED",
        performed_by="Admin",
        details=f"Deleted employee {employee_name} ({employee_role}) and removed all associated shift assignments.",
        reason_code="ROSTER_ADJUSTMENT"
    )
    session.add(audit_log)
    
    session.commit()
    return {"status": "deleted"}


@app.post("/shifts/publish")
def publish_shifts(req: PublishRequest, session: SessionDep) -> dict:
    start_dt = parse_date(req.start_date)
    end_dt = parse_date(req.end_date)
    
    shifts = session.exec(select(Shift).where(Shift.date >= start_dt, Shift.date <= end_dt)).all()
    count = 0
    for s in shifts:
        if not s.is_published:
            s.is_published = True
            session.add(s)
            count += 1
            
    if count > 0:
        log = AuditLog(action="ROSTER_PUBLISHED", details=f"Published {count} shifts from {start_dt} to {end_dt}")
        session.add(log)
        session.commit()
        
    return {"message": f"Published {count} shifts."}


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


@app.post("/shifts/{shift_id}/locum-pool")
def toggle_locum_pool(shift_id: int, session: SessionDep) -> dict:
    shift = session.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift.offered_to_locum_pool = not shift.offered_to_locum_pool
    session.add(shift)
    session.commit()
    return {"status": "success", "offered_to_locum_pool": shift.offered_to_locum_pool}



@app.post("/assignments")
def create_assignment(assignment: AssignmentRequest, session: SessionDep) -> dict:
    employee = session.get(Employee, assignment.employee_id)
    shift = session.get(Shift, assignment.shift_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    # 0. Check Absence
    absences = session.exec(select(Absence).where(Absence.employee_id == employee.id)).all()
    absence_warning = check_absence_compliance(employee.id, shift.date, absences)
    if absence_warning and not assignment.ignore_warnings:
        raise HTTPException(
            status_code=400,
            detail={"type": "COMPLIANCE_WARNING", "message": absence_warning}
        )

    # 1. Hard Rejection: Grade / Band Compliance Check
    grade_err = check_grade_compliance(employee.grade, shift.required_grade)
    if grade_err:
        raise HTTPException(status_code=400, detail=grade_err)

    # 2. Collect employee's existing shifts to check rest regulations
    existing_assignments = session.exec(
        select(ShiftAssignment).where(ShiftAssignment.employee_id == employee.id)
    ).all()
    existing_shifts = []
    for ea in existing_assignments:
        if ea.shift_id == shift.id:
            continue
        s = session.get(Shift, ea.shift_id)
        if s:
            existing_shifts.append(s)

    # 3. Soft Rejections: EWTD Regulations (48hr limit, 11hr rest period)
    rest_err = check_11hr_rest_compliance(shift, existing_shifts)
    weekly_err = check_48hr_weekly_compliance(shift, existing_shifts)
    compliance_warning = rest_err or weekly_err

    if compliance_warning:
        if not assignment.ignore_warnings:
            # Return warning structure so UI can present override prompts
            raise HTTPException(
                status_code=400,
                detail={
                    "type": "COMPLIANCE_WARNING",
                    "message": compliance_warning
                }
            )
        else:
            # Enforce override justification
            if not assignment.override_justification or len(assignment.override_justification.strip()) < 5:
                raise HTTPException(
                    status_code=400,
                    detail="A valid 1-sentence justification is required to override NHS compliance regulations."
                )

    db_assignment = ShiftAssignment(
        employee_id=assignment.employee_id,
        shift_id=assignment.shift_id,
        shift_date=shift.date,
        shift_slot=shift_slot(shift),
    )
    session.add(db_assignment)

    # Log operational audit
    if compliance_warning:
        audit_log = AuditLog(
            action="EMERGENCY_OVERRIDE",
            performed_by="Admin",
            details=f"Overrode compliance warning for {employee.name} on shift {shift.date} ({shift_slot(shift)}). Warning: {compliance_warning}",
            reason_code=assignment.reason_code,
            override_justification=assignment.override_justification
        )
    else:
        audit_log = AuditLog(
            action="ASSIGNMENT_CREATED",
            performed_by="Admin",
            details=f"Assigned {employee.name} ({employee.grade}) to shift on {shift.date} ({shift_slot(shift)}) at {shift.location}.",
            reason_code="ROSTER_ADJUSTMENT"
        )
    session.add(audit_log)

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
def delete_assignment(assignment_id: int, session: SessionDep, reason_code: str = "ROSTER_ADJUSTMENT") -> dict[str, str]:
    assignment = session.get(ShiftAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    employee = session.get(Employee, assignment.employee_id)
    shift = session.get(Shift, assignment.shift_id)
    
    emp_name = employee.name if employee else "Unknown Employee"
    shift_info = f"{shift.date} ({shift_slot(shift)})" if shift else "Unknown Shift"

    session.delete(assignment)

    audit_log = AuditLog(
        action="ASSIGNMENT_DELETED",
        performed_by="Admin",
        details=f"Removed {emp_name} from their scheduled shift on {shift_info}.",
        reason_code=reason_code
    )
    session.add(audit_log)
    session.commit()
    return {"status": "deleted"}


# Shift Swap Request Endpoints

@app.post("/assignments/swap-request")
def create_swap_request(req: SwapCreateRequest, session: SessionDep) -> ShiftSwapRequest:
    # 1. Verify employee and shift exist
    employee = session.get(Employee, req.requesting_employee_id)
    shift = session.get(Shift, req.shift_id)
    if not employee or not shift:
        raise HTTPException(status_code=404, detail="Employee or Shift not found")

    # 2. Verify requesting employee is actually assigned to the shift
    assignment = session.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.employee_id == req.requesting_employee_id,
            ShiftAssignment.shift_id == req.shift_id
        )
    ).first()
    if not assignment:
        raise HTTPException(status_code=400, detail="Employee is not currently assigned to this shift.")

    # 3. Create swap request
    swap = ShiftSwapRequest(
        requesting_employee_id=req.requesting_employee_id,
        shift_id=req.shift_id,
        target_employee_id=req.target_employee_id,
        status="PENDING"
    )
    session.add(swap)

    # Log audit entry
    audit = AuditLog(
        action="SWAP_REQUESTED",
        performed_by="Admin",
        details=f"{employee.name} requested a shift swap for shift on {shift.date} ({shift_slot(shift)}).",
        reason_code="ROSTER_ADJUSTMENT"
    )
    session.add(audit)
    session.commit()
    session.refresh(swap)
    return swap


@app.get("/assignments/swap-requests")
def list_swap_requests(session: SessionDep) -> list[dict]:
    requests = session.exec(select(ShiftSwapRequest).where(ShiftSwapRequest.status == "PENDING")).all()
    result = []
    for r in requests:
        req_emp = session.get(Employee, r.requesting_employee_id)
        shift = session.get(Shift, r.shift_id)
        tar_emp = session.get(Employee, r.target_employee_id) if r.target_employee_id else None
        
        result.append({
            "id": r.id,
            "requesting_employee_id": r.requesting_employee_id,
            "requesting_employee_name": req_emp.name if req_emp else "Unknown",
            "requesting_employee_grade": req_emp.grade if req_emp else "",
            "shift_id": r.shift_id,
            "shift_date": str(shift.date) if shift else "",
            "shift_slot": shift_slot(shift) if shift else "",
            "shift_location": shift.location if shift else "",
            "shift_required_grade": shift.required_grade if shift else "",
            "target_employee_id": r.target_employee_id,
            "target_employee_name": tar_emp.name if tar_emp else "Open Swap Pool",
            "created_at": r.created_at.isoformat()
        })
    return result


@app.post("/assignments/swap-request/{swap_id}/approve")
def approve_swap_request(swap_id: int, approval: SwapApprovalRequest, session: SessionDep) -> dict:
    swap = session.get(ShiftSwapRequest, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Shift swap request not found")
    if swap.status != "PENDING":
        raise HTTPException(status_code=400, detail="This swap request has already been resolved.")

    # 1. Fetch swap entities
    req_employee = session.get(Employee, swap.requesting_employee_id)
    rec_employee = session.get(Employee, approval.target_employee_id)
    shift = session.get(Shift, swap.shift_id)

    if not req_employee or not rec_employee or not shift:
        raise HTTPException(status_code=404, detail="Requesting employee, recipient employee, or shift not found")

    # 2. Enforce Grade Match Check on Recipient
    grade_err = check_grade_compliance(rec_employee.grade, shift.required_grade)
    if grade_err:
        raise HTTPException(status_code=400, detail=f"Swap Recipient {grade_err}")

    # 3. Fetch recipient's existing shifts to check rest regulations
    rec_assignments = session.exec(
        select(ShiftAssignment).where(ShiftAssignment.employee_id == rec_employee.id)
    ).all()
    rec_shifts = [session.get(Shift, ra.shift_id) for ra in rec_assignments if session.get(Shift, ra.shift_id)]

    # 4. Check recipient EWTD compliance (rest, weekly)
    rest_err = check_11hr_rest_compliance(shift, rec_shifts)
    weekly_err = check_48hr_weekly_compliance(shift, rec_shifts)
    compliance_warning = rest_err or weekly_err

    if compliance_warning:
        if not approval.ignore_warnings:
            raise HTTPException(
                status_code=400,
                detail={
                    "type": "COMPLIANCE_WARNING",
                    "message": f"Recipient Compliance warning: {compliance_warning}"
                }
            )
        else:
            if not approval.override_justification or len(approval.override_justification.strip()) < 5:
                raise HTTPException(
                    status_code=400,
                    detail="A valid 1-sentence justification is required to override recipient compliance regulations."
                )

    # 5. Execute Rota swap:
    # A. Delete old assignment
    old_assignment = session.exec(
        select(ShiftAssignment).where(
            ShiftAssignment.employee_id == swap.requesting_employee_id,
            ShiftAssignment.shift_id == swap.shift_id
        )
    ).first()
    if old_assignment:
        session.delete(old_assignment)

    # B. Create new assignment
    new_assignment = ShiftAssignment(
        employee_id=approval.target_employee_id,
        shift_id=swap.shift_id,
        shift_date=shift.date,
        shift_slot=shift_slot(shift)
    )
    session.add(new_assignment)

    # C. Update swap request status
    swap.status = "APPROVED"
    swap.target_employee_id = approval.target_employee_id
    session.add(swap)

    # D. Log operational compliance overrides or standard swap log
    if compliance_warning:
        audit = AuditLog(
            action="EMERGENCY_OVERRIDE",
            performed_by="Admin",
            details=f"Approved shift swap: {req_employee.name} -> {rec_employee.name} on shift {shift.date} with compliance warning override: {compliance_warning}",
            reason_code=approval.reason_code,
            override_justification=approval.override_justification
        )
    else:
        audit = AuditLog(
            action="SWAP_APPROVED",
            performed_by="Admin",
            details=f"Approved shift swap: shift on {shift.date} ({shift_slot(shift)}) transferred from {req_employee.name} to {rec_employee.name}.",
            reason_code="ROSTER_ADJUSTMENT"
        )
    session.add(audit)
    session.commit()

    return {"status": "swapped", "new_assignment_id": new_assignment.id}


@app.get("/audit-logs")
def get_audit_logs(session: SessionDep, limit: int = 50) -> list[AuditLog]:
    return session.exec(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)).all()


# --- ABSENCE ROUTES ---

@app.get("/absences")
def get_absences(session: SessionDep) -> list[dict]:
    absences = session.exec(select(Absence)).all()
    result = []
    for a in absences:
        emp = session.get(Employee, a.employee_id)
        result.append({
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": emp.name if emp else "Unknown",
            "date": str(a.date),
            "reason": a.reason
        })
    return result

@app.post("/absences")
def create_absence(absence_in: AbsenceCreate, session: SessionDep) -> Absence:
    absence = Absence.model_validate(absence_in)
    session.add(absence)
    
    emp = session.get(Employee, absence.employee_id)
    emp_name = emp.name if emp else "Unknown"
    
    log = AuditLog(
        action="ABSENCE_CREATED",
        details=f"Recorded absence for {emp_name} on {absence.date} (Reason: {absence.reason})"
    )
    session.add(log)
    session.commit()
    session.refresh(absence)
    return absence

@app.delete("/absences/{absence_id}")
def delete_absence(absence_id: int, session: SessionDep) -> dict:
    absence = session.get(Absence, absence_id)
    if not absence:
        raise HTTPException(status_code=404, detail="Absence not found")
        
    emp = session.get(Employee, absence.employee_id)
    emp_name = emp.name if emp else "Unknown"
    
    session.delete(absence)
    log = AuditLog(
        action="ABSENCE_DELETED",
        details=f"Removed absence for {emp_name} on {absence.date}"
    )
    session.add(log)
    session.commit()
    return {"ok": True}


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
                                "grade": employee.grade,
                                "is_locum": employee.is_locum,
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
                    "required_grade": shift.required_grade,
                    "offered_to_locum_pool": shift.offered_to_locum_pool,
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
    writer.writerow(["Date", "Day", "Start", "End", "Location", "Employee", "Role", "Grade", "Department"])

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
                            employee["grade"],
                            employee["department"],
                            ]
                    )
            else:
                writer.writerow(
                    [day["date"], day["day"], shift["start_time"], shift["end_time"], shift["location"], "", "", "", ""]
                )

    output.seek(0)
    filename = f"staffrota-{rota['week_start']}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )