import logging
from datetime import date, timedelta

from sqlmodel import Session, delete

from database import create_db_and_tables, engine
from models import Employee, Shift, ShiftAssignment


def this_week_dates() -> list[str]:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return [(monday + timedelta(days=offset)).isoformat() for offset in range(5)]


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
        Shift(date=dates[0], start_time="08:00", end_time="16:00", location="Ward A"),
        Shift(date=dates[1], start_time="09:00", end_time="17:00", location="Warehouse North"),
        Shift(date=dates[2], start_time="10:00", end_time="18:00", location="Call Centre"),
        Shift(date=dates[3], start_time="07:00", end_time="15:00", location="Operations Hub"),
        Shift(date=dates[4], start_time="12:00", end_time="20:00", location="Ward B"),
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
                ShiftAssignment(employee_id=employees[0].id, shift_id=shifts[0].id),
                ShiftAssignment(employee_id=employees[1].id, shift_id=shifts[1].id),
                ShiftAssignment(employee_id=employees[2].id, shift_id=shifts[2].id),
            ]
        )
        session.commit()

    logging.info("Seed data created successfully.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seed()
