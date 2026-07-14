import logging
from datetime import date, time, timedelta

from sqlmodel import Session, delete

from database import create_db_and_tables, engine
from models import Employee, Shift, ShiftAssignment


def this_week_dates() -> list[date]:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return [monday + timedelta(days=offset) for offset in range(5)]


def run_seed() -> None:
    create_db_and_tables()
    dates = this_week_dates()

    employees = [
        Employee(name="Aisha Khan", role="Nurse", department="Clinical"),
        Employee(name="Tom Bradley", role="Warehouse Operative", department="Logistics"),
        Employee(name="Maya Chen", role="Support Agent", department="Customer Support"),
        Employee(name="Daniel Price", role="Team Lead", department="Operations"),
        Employee(name="Priya Patel", role="Care Coordinator", department="Scheduling"),
    ]
    shifts = [
        Shift(date=dates[0], start_time=time(8, 0), end_time=time(16, 0), location="Ward A"),
        Shift(date=dates[1], start_time=time(9, 0), end_time=time(17, 0), location="Warehouse North"),
        Shift(date=dates[2], start_time=time(10, 0), end_time=time(18, 0), location="Call Centre"),
        Shift(date=dates[3], start_time=time(7, 0), end_time=time(15, 0), location="Operations Hub"),
        Shift(date=dates[4], start_time=time(12, 0), end_time=time(20, 0), location="Ward B"),
    ]

    with Session(engine) as session:
        session.exec(delete(ShiftAssignment))
        session.exec(delete(Shift))
        session.exec(delete(Employee))
        session.commit()

        session.add_all(employees)
        session.add_all(shifts)
        session.commit()

        for item in employees + shifts:
            session.refresh(item)

        session.add_all(
            [
                ShiftAssignment(
                    employee_id=employees[0].id,
                    shift_id=shifts[0].id,
                    shift_date=shifts[0].date,
                    shift_slot=f"{shifts[0].start_time.strftime('%H:%M')}-{shifts[0].end_time.strftime('%H:%M')}"
                ),
                ShiftAssignment(
                    employee_id=employees[1].id,
                    shift_id=shifts[1].id,
                    shift_date=shifts[1].date,
                    shift_slot=f"{shifts[1].start_time.strftime('%H:%M')}-{shifts[1].end_time.strftime('%H:%M')}"
                ),
                ShiftAssignment(
                    employee_id=employees[2].id,
                    shift_id=shifts[2].id,
                    shift_date=shifts[2].date,
                    shift_slot=f"{shifts[2].start_time.strftime('%H:%M')}-{shifts[2].end_time.strftime('%H:%M')}"
                ),
            ]
        )
        session.commit()

    logging.info("Seed data created successfully.")


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    run_seed()
