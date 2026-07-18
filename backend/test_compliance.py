import pytest
from datetime import date, time
from models import Shift, Employee
from compliance import (
    check_11hr_rest_compliance,
    check_48hr_weekly_compliance,
    check_grade_compliance
)

def test_check_11hr_rest_compliance():
    # Proposed Shift: Monday 12:00 - 20:00
    proposed = Shift(
        date=date(2026, 7, 20),
        start_time=time(12, 0),
        end_time=time(20, 0),
        location="Ward A",
        required_grade="Band 5 Nurse"
    )

    # 1. Compliant previous shift (leaves 16 hours rest)
    prev_compliant = Shift(
        date=date(2026, 7, 19),
        start_time=time(12, 0),
        end_time=time(20, 0),
        location="Ward B",
        required_grade="Band 5 Nurse"
    )
    assert check_11hr_rest_compliance(proposed, [prev_compliant]) is None

    # 2. Non-compliant previous shift (leaves only 10 hours rest)
    prev_non_compliant = Shift(
        date=date(2026, 7, 20),
        start_time=time(0, 0),
        end_time=time(2, 0),
        location="Ward B",
        required_grade="Band 5 Nurse"
    )
    result = check_11hr_rest_compliance(proposed, [prev_non_compliant])
    assert result is not None
    assert "Less than 11 hours rest" in result

    # 3. Overnight shift compliance check
    overnight = Shift(
        date=date(2026, 7, 19),
        start_time=time(22, 0),
        end_time=time(6, 0),  # ends Monday 6am
        location="Ward A",
        required_grade="Band 5 Nurse"
    )
    # Proposed shift is Monday 12:00 - 20:00. Rest between 6:00 and 12:00 is only 6 hours!
    result = check_11hr_rest_compliance(proposed, [overnight])
    assert result is not None
    assert "Only 6.0 hours rest" in result


def test_check_48hr_weekly_compliance():
    proposed = Shift(
        date=date(2026, 7, 20),  # Monday
        start_time=time(8, 0),
        end_time=time(20, 0),    # 12 hours
        location="Ward A",
        required_grade="Band 5 Nurse"
    )

    # Accumulate 3 shifts of 12 hours = 36 hours
    existing = [
        Shift(date=date(2026, 7, 21), start_time=time(8, 0), end_time=time(20, 0), location="A", required_grade="B"),
        Shift(date=date(2026, 7, 22), start_time=time(8, 0), end_time=time(20, 0), location="A", required_grade="B"),
        Shift(date=date(2026, 7, 23), start_time=time(8, 0), end_time=time(20, 0), location="A", required_grade="B"),
    ]

    # Total: 12 + 36 = 48 hours -> Compliant
    assert check_48hr_weekly_compliance(proposed, existing) is None

    # Add one more shift (total 60 hours -> Non-compliant)
    existing.append(
        Shift(date=date(2026, 7, 24), start_time=time(8, 0), end_time=time(20, 0), location="A", required_grade="B")
    )
    result = check_48hr_weekly_compliance(proposed, existing)
    assert result is not None
    assert "Exceeds 48-hour weekly limit" in result


def test_check_grade_compliance():
    # Stream validation
    assert check_grade_compliance("Consultant", "Junior Doctor") is None      # Consultant can cover Junior Doctor
    assert check_grade_compliance("Junior Doctor", "Consultant") is not None  # Junior Doctor cannot cover Consultant
    assert check_grade_compliance("Band 6 Nurse", "Band 5 Nurse") is None     # Band 6 Nurse can cover Band 5 Nurse
    assert check_grade_compliance("Band 5 Nurse", "Band 6 Nurse") is not None  # Band 5 Nurse cannot cover Band 6 Nurse
    assert check_grade_compliance("Band 5 Nurse", "Junior Doctor") is not None # Nurse cannot cover Doctor
