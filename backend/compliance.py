from datetime import datetime, timedelta
from models import Shift, Employee

def get_shift_datetimes(shift: Shift) -> tuple[datetime, datetime]:
    """
    Combines a shift's date and time fields into absolute start and end datetimes.
    Handles shifts that cross midnight (overnight shifts).
    """
    start_dt = datetime.combine(shift.date, shift.start_time)
    
    # If end_time is chronologically before start_time, the shift crossed midnight
    if shift.end_time < shift.start_time:
        end_dt = datetime.combine(shift.date + timedelta(days=1), shift.end_time)
    else:
        end_dt = datetime.combine(shift.date, shift.end_time)
        
    return start_dt, end_dt


def check_11hr_rest_compliance(
    proposed_shift: Shift, 
    assigned_shifts: list[Shift]
) -> str | None:
    """
    Checks if a proposed shift leaves at least an 11-hour rest window 
    before and after the employee's existing assigned shifts.
    """
    proposed_start, proposed_end = get_shift_datetimes(proposed_shift)
    REQUIRED_REST = timedelta(hours=11)

    for shift in assigned_shifts:
        start_dt, end_dt = get_shift_datetimes(shift)

        # 1. Existing shift is BEFORE the proposed one
        if end_dt <= proposed_start:
            rest_before = proposed_start - end_dt
            if rest_before < REQUIRED_REST:
                rest_hours = rest_before.total_seconds() / 3600
                return f"Less than 11 hours rest from previous shift. Only {rest_hours:.1f} hours rest."

        # 2. Existing shift is AFTER the proposed one
        if start_dt >= proposed_end:
            rest_after = start_dt - proposed_end
            if rest_after < REQUIRED_REST:
                rest_hours = rest_after.total_seconds() / 3600
                return f"Less than 11 hours rest before next shift. Only {rest_hours:.1f} hours rest."

    return None


def check_48hr_weekly_compliance(
    proposed_shift: Shift,
    assigned_shifts: list[Shift]
) -> str | None:
    """
    Calculates total weekly scheduled hours (Monday - Sunday) for the target shift week.
    Returns a warning string if hours exceed 48.
    """
    # Find Monday start of the week for the proposed shift's date
    selected_date = proposed_shift.date
    start_of_week = selected_date - timedelta(days=selected_date.weekday())
    end_of_week = start_of_week + timedelta(days=6)

    # Start with proposed shift duration
    p_start, p_end = get_shift_datetimes(proposed_shift)
    total_seconds = (p_end - p_start).total_seconds()

    # Sum all existing assigned shifts in that same week
    for shift in assigned_shifts:
        if start_of_week <= shift.date <= end_of_week:
            s_start, s_end = get_shift_datetimes(shift)
            total_seconds += (s_end - s_start).total_seconds()

    total_hours = total_seconds / 3600
    if total_hours > 48.0:
        return f"Exceeds 48-hour weekly limit. Total scheduled: {total_hours:.1f} hours."

    return None


def check_grade_compliance(employee_grade: str, required_grade: str) -> str | None:
    """
    Validates clinical grade hierarchy.
    Medical Staff: Consultant (3) > Registrar (2) > Junior Doctor (1)
    Nursing Staff: Band 6 Nurse (2) > Band 5 Nurse (1)
    Ensures employee grade meets or exceeds the required shift grade.
    """
    if employee_grade == required_grade:
        return None

    hierarchy = {
        "Consultant": 3,
        "Registrar": 2,
        "Junior Doctor": 1,
        "Band 6 Nurse": 2,
        "Band 5 Nurse": 1
    }

    medical_staff = ["Consultant", "Registrar", "Junior Doctor"]
    nursing_staff = ["Band 6 Nurse", "Band 5 Nurse"]

    is_med_emp = employee_grade in medical_staff
    is_med_req = required_grade in medical_staff
    is_nur_emp = employee_grade in nursing_staff
    is_nur_req = required_grade in nursing_staff

    # Validate streams match (e.g. a Nurse cannot cover a Doctor shift)
    if (is_med_emp and is_med_req) or (is_nur_emp and is_nur_req):
        if hierarchy.get(employee_grade, 0) >= hierarchy.get(required_grade, 0):
            return None

    return f"Grade mismatch: Employee grade ({employee_grade}) does not meet the required grade ({required_grade}) for this shift."
