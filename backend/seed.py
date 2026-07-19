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
        # Permanent Medical & Nursing Staff - Royal Stoke
        Employee(name="Dr. Sarah Jenkins", role="Consultant", department="Major Trauma Centre", grade="Consultant", is_locum=False),
        Employee(name="Dr. Liam O'Connor", role="Registrar", department="Emergency Department", grade="Registrar", is_locum=False),
        Employee(name="Sister Emma Davies", role="Senior Sister", department="Critical Care Unit", grade="Band 6 Nurse", is_locum=False),
        Employee(name="Nurse James Smith", role="Staff Nurse", department="Acute Medical Unit", grade="Band 5 Nurse", is_locum=False),
        Employee(name="Dr. Emily Chen", role="Junior Doctor", department="Cardiology", grade="Junior Doctor", is_locum=False),
        Employee(name="Nurse Chloe Evans", role="Staff Nurse", department="Maternity", grade="Band 5 Nurse", is_locum=False),
        
        # Locum (Agency) Staff
        Employee(name="Nurse Priya Patel", role="Locum Staff Nurse", department="Agency Pool", grade="Band 5 Nurse", is_locum=True),
        Employee(name="Dr. Robert Taylor", role="Locum Consultant", department="Agency Pool", grade="Consultant", is_locum=True),
        Employee(name="Dr. Amina Hassan", role="Locum Registrar", department="Agency Pool", grade="Registrar", is_locum=True),
    ]
    
    # Shifts with required grades, representing Royal Stoke
    shifts = [
        # Monday Shifts
        Shift(date=dates[0], start_time=time(8, 0), end_time=time(20, 0), location="Major Trauma Centre", required_grade="Consultant"),
        Shift(date=dates[0], start_time=time(7, 30), end_time=time(19, 30), location="Critical Care Unit", required_grade="Band 6 Nurse"),
        Shift(date=dates[0], start_time=time(19, 0), end_time=time(7, 0), location="Emergency Department", required_grade="Registrar", offered_to_locum_pool=True),
        
        # Tuesday Shifts
        Shift(date=dates[1], start_time=time(8, 0), end_time=time(16, 0), location="Acute Medical Unit", required_grade="Band 5 Nurse"),
        Shift(date=dates[1], start_time=time(12, 0), end_time=time(20, 0), location="Cardiology", required_grade="Junior Doctor"),
        Shift(date=dates[1], start_time=time(20, 0), end_time=time(8, 0), location="Maternity", required_grade="Band 5 Nurse"),
        
        # Wednesday Shifts
        Shift(date=dates[2], start_time=time(8, 0), end_time=time(16, 0), location="Emergency Department", required_grade="Registrar"),
        Shift(date=dates[2], start_time=time(14, 0), end_time=time(22, 0), location="Major Trauma Centre", required_grade="Consultant", offered_to_locum_pool=True),
        
        # Thursday Shifts
        Shift(date=dates[3], start_time=time(7, 30), end_time=time(19, 30), location="Critical Care Unit", required_grade="Band 6 Nurse"),
        Shift(date=dates[3], start_time=time(22, 0), end_time=time(8, 0), location="Acute Medical Unit", required_grade="Band 5 Nurse"),
        
        # Friday Shifts
        Shift(date=dates[4], start_time=time(8, 0), end_time=time(20, 0), location="Cardiology", required_grade="Junior Doctor"),
        Shift(date=dates[4], start_time=time(19, 0), end_time=time(7, 0), location="Major Trauma Centre", required_grade="Consultant"),
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
            # Sarah assigned to MTC Consultant shift
            ShiftAssignment(employee_id=employees[0].id, shift_id=shifts[0].id, shift_date=shifts[0].date, shift_slot=f"{shifts[0].start_time.strftime('%H:%M')}-{shifts[0].end_time.strftime('%H:%M')}"),
            # Emma assigned to CCU Band 6 Nurse shift
            ShiftAssignment(employee_id=employees[2].id, shift_id=shifts[1].id, shift_date=shifts[1].date, shift_slot=f"{shifts[1].start_time.strftime('%H:%M')}-{shifts[1].end_time.strftime('%H:%M')}"),
            # James assigned to AMU on Tuesday
            ShiftAssignment(employee_id=employees[3].id, shift_id=shifts[3].id, shift_date=shifts[3].date, shift_slot=f"{shifts[3].start_time.strftime('%H:%M')}-{shifts[3].end_time.strftime('%H:%M')}"),
            # Emily assigned to Cardiology on Tuesday
            ShiftAssignment(employee_id=employees[4].id, shift_id=shifts[4].id, shift_date=shifts[4].date, shift_slot=f"{shifts[4].start_time.strftime('%H:%M')}-{shifts[4].end_time.strftime('%H:%M')}"),
            # Chloe assigned to Maternity on Tuesday
            ShiftAssignment(employee_id=employees[5].id, shift_id=shifts[5].id, shift_date=shifts[5].date, shift_slot=f"{shifts[5].start_time.strftime('%H:%M')}-{shifts[5].end_time.strftime('%H:%M')}"),
            # Liam assigned to ED on Wednesday
            ShiftAssignment(employee_id=employees[1].id, shift_id=shifts[6].id, shift_date=shifts[6].date, shift_slot=f"{shifts[6].start_time.strftime('%H:%M')}-{shifts[6].end_time.strftime('%H:%M')}"),
            # Emma assigned to CCU on Thursday
            ShiftAssignment(employee_id=employees[2].id, shift_id=shifts[8].id, shift_date=shifts[8].date, shift_slot=f"{shifts[8].start_time.strftime('%H:%M')}-{shifts[8].end_time.strftime('%H:%M')}"),
            # Emily assigned to Cardiology on Friday
            ShiftAssignment(employee_id=employees[4].id, shift_id=shifts[10].id, shift_date=shifts[10].date, shift_slot=f"{shifts[10].start_time.strftime('%H:%M')}-{shifts[10].end_time.strftime('%H:%M')}"),
        ]
        
        session.add_all(assignments)
        
        # Seed an audit log entry
        audit = AuditLog(
            action="ROSTER_SEEDED",
            performed_by="System",
            details="Royal Stoke NHS compliance roster seeded with permanent and locum staff schedules.",
            reason_code="ROSTER_ADJUSTMENT"
        )
        session.add(audit)
        
        # Seed a pending swap request (Emma wants to swap her Thursday shift)
        swap = ShiftSwapRequest(
            requesting_employee_id=employees[2].id,
            shift_id=shifts[8].id,
            status="PENDING"
        )
        session.add(swap)
        
        session.commit()

    logging.info("Royal Stoke compliance seed data created successfully.")


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    run_seed()

