import logging
from datetime import date, time, timedelta

from sqlmodel import Session, delete

from database import create_db_and_tables, engine
from models import Employee, Shift, ShiftAssignment, AuditLog, ShiftSwapRequest

def this_week_dates() -> list[date]:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    # Return dates for Monday to Sunday
    return [monday + timedelta(days=offset) for offset in range(7)]


def run_seed() -> None:
    create_db_and_tables()
    dates = this_week_dates()

    # NHS Grades: 'Band 5 Nurse', 'Band 6 Nurse', 'Junior Doctor', 'Registrar', 'Consultant'
    employees = [
        # Permanent Medical & Nursing Staff
        Employee(name="Dr. Aisha Khan", role="Consultant", department="A&E", grade="Consultant", is_locum=False),
        Employee(name="Dr. Tom Bradley", role="Registrar", department="Pediatrics", grade="Registrar", is_locum=False),
        Employee(name="Sister Maya Chen", role="Sister / Senior Nurse", department="Ward 3", grade="Band 6 Nurse", is_locum=False),
        Employee(name="Nurse Daniel Price", role="Staff Nurse", department="ICU", grade="Band 5 Nurse", is_locum=False),
        
        # Locum (Agency) Staff
        Employee(name="Nurse Priya Patel", role="Locum Staff Nurse", department="Agency Pool", grade="Band 5 Nurse", is_locum=True),
        Employee(name="Dr. Sarah Jenkins", role="Locum Junior Doctor", department="Agency Pool", grade="Junior Doctor", is_locum=True),
    ]
    
    # Shifts with required grades, representing typical ward shifts
    shifts = [
        # Monday Shifts
        Shift(date=dates[0], start_time=time(8, 0), end_time=time(16, 0), location="A&E Ward", required_grade="Consultant"),
        Shift(date=dates[0], start_time=time(12, 0), end_time=time(20, 0), location="Ward 3", required_grade="Band 6 Nurse"),
        
        # Tuesday Shifts (Daniel Price rest-violation shift target)
        Shift(date=dates[1], start_time=time(8, 0), end_time=time(16, 0), location="ICU", required_grade="Band 5 Nurse"),
        Shift(date=dates[1], start_time=time(6, 0), end_time=time(14, 0), location="Ward 3", required_grade="Band 5 Nurse"),
        
        # Wednesday Shifts (offered to locums)
        Shift(date=dates[2], start_time=time(20, 0), end_time=time(4, 0), location="A&E Ward", required_grade="Junior Doctor", offered_to_locum_pool=True),
        
        # Thursday Shifts
        Shift(date=dates[3], start_time=time(9, 0), end_time=time(17, 0), location="Pediatrics", required_grade="Registrar"),
    ]

    with Session(engine) as session:
        # Clear existing data
        session.exec(delete(AuditLog))
        session.exec(delete(ShiftSwapRequest))
        session.exec(delete(ShiftAssignment))
        session.exec(delete(Shift))
        session.exec(delete(Employee))
        session.commit()

        # Add employees and shifts
        session.add_all(employees)
        session.add_all(shifts)
        session.commit()

        # Refresh to get database IDs
        for item in employees + shifts:
            session.refresh(item)

        # Seed initial assignments
        assignments = [
            # Aisha assigned to A&E Consultant shift
            ShiftAssignment(
                employee_id=employees[0].id,
                shift_id=shifts[0].id,
                shift_date=shifts[0].date,
                shift_slot=f"{shifts[0].start_time.strftime('%H:%M')}-{shifts[0].end_time.strftime('%H:%M')}"
            ),
            # Maya assigned to Ward 3 Band 6 Nurse shift
            ShiftAssignment(
                employee_id=employees[2].id,
                shift_id=shifts[1].id,
                shift_date=shifts[1].date,
                shift_slot=f"{shifts[1].start_time.strftime('%H:%M')}-{shifts[1].end_time.strftime('%H:%M')}"
            ),
            # Daniel assigned to ICU on Tuesday
            ShiftAssignment(
                employee_id=employees[3].id,
                shift_id=shifts[2].id,
                shift_date=shifts[2].date,
                shift_slot=f"{shifts[2].start_time.strftime('%H:%M')}-{shifts[2].end_time.strftime('%H:%M')}"
            ),
        ]
        
        session.add_all(assignments)
        
        # Seed an audit log entry
        audit = AuditLog(
            action="ROSTER_SEEDED",
            performed_by="System",
            details="Initial NHS compliance roster seeded with permanent and locum staff schedules.",
            reason_code="LEAVE_COVER"
        )
        session.add(audit)
        
        # Seed a pending swap request (Tom wants to swap his Thursday shift)
        swap = ShiftSwapRequest(
            requesting_employee_id=employees[1].id,
            shift_id=shifts[5].id,
            status="PENDING"
        )
        session.add(swap)
        
        session.commit()

    logging.info("NHS compliance seed data created successfully.")


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    run_seed()

