import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy.pool import StaticPool
from database import get_session
from main import app
from models import Employee, Shift, ShiftAssignment, AuditLog, ShiftSwapRequest

# Setup in-memory test database with StaticPool to share connection across threads/requests
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

def override_get_session():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = override_get_session

@pytest.fixture(name="session", scope="function", autouse=True)
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture():
    with TestClient(app) as test_client:
        yield test_client

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_employee(client):
    payload = {
        "name": "Jane Doe",
        "role": "Nurse",
        "department": "A&E",
        "grade": "Band 5 Nurse",
        "is_locum": False
    }
    response = client.post("/employees", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Jane Doe"
    assert data["id"] is not None

def test_create_shift_and_conflict(client):
    # 1. Create employee
    employee_response = client.post("/employees", json={
        "name": "Alice Smith",
        "role": "Doctor",
        "department": "Cardiology",
        "grade": "Junior Doctor",
        "is_locum": False
    })
    emp_id = employee_response.json()["id"]

    # 2. Create two shifts on the same day
    shift1_response = client.post("/shifts", json={
        "date": "2026-07-01",
        "start_time": "08:00",
        "end_time": "16:00",
        "location": "Ward A",
        "required_grade": "Junior Doctor"
    })
    shift1_id = shift1_response.json()["id"]

    shift2_response = client.post("/shifts", json={
        "date": "2026-07-01",
        "start_time": "16:00",
        "end_time": "23:59",
        "location": "Ward B",
        "required_grade": "Junior Doctor"
    })
    shift2_id = shift2_response.json()["id"]

    # 3. Create first assignment
    assign1_response = client.post("/assignments", json={
        "employee_id": emp_id,
        "shift_id": shift1_id
    })
    assert assign1_response.status_code == 200

    # 4. Attempt to create second assignment on the same day (database-enforced conflict!)
    assign2_response = client.post("/assignments", json={
        "employee_id": emp_id,
        "shift_id": shift2_id,
        "ignore_warnings": True,
        "reason_code": "EMERGENCY_OVERRIDE",
        "override_justification": "Emergency backup required for ward operations."
    })
    assert assign2_response.status_code == 409
    assert "Conflict" in assign2_response.json()["detail"]

def test_export_rota_csv(client):
    # Create employee & shift
    employee_response = client.post("/employees", json={
        "name": "Bob",
        "role": "Staff",
        "department": "HQ",
        "grade": "Band 5 Nurse"
    })
    emp_id = employee_response.json()["id"]
    
    shift_response = client.post("/shifts", json={
        "date": "2026-07-01",
        "start_time": "09:00",
        "end_time": "17:00",
        "location": "HQ Desk",
        "required_grade": "Band 5 Nurse"
    })
    shift_id = shift_response.json()["id"]

    # Assign
    client.post("/assignments", json={"employee_id": emp_id, "shift_id": shift_id})

    # Export CSV
    response = client.get("/rota/export?date=2026-07-01")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "staffrota-2026-06-29.csv" in response.headers["content-disposition"]
    
    content = response.text
    assert "HQ Desk" in content
    assert "Bob" in content


def test_assignment_persists_shift_date_and_slot(client, session):
    employee_response = client.post("/employees", json={
        "name": "Charlie Jones",
        "role": "Nurse",
        "department": "Emergency",
        "grade": "Band 5 Nurse"
    })
    emp_id = employee_response.json()["id"]

    shift_response = client.post("/shifts", json={
        "date": "2026-07-02",
        "start_time": "07:00",
        "end_time": "15:00",
        "location": "Ward C",
        "required_grade": "Band 5 Nurse"
    })
    shift_id = shift_response.json()["id"]

    response = client.post("/assignments", json={"employee_id": emp_id, "shift_id": shift_id})
    assert response.status_code == 200

    assignment = session.exec(select(ShiftAssignment)).one()
    assert str(assignment.shift_date) == "2026-07-02"
    assert assignment.shift_slot == "07:00-15:00"


def test_assignment_grade_mismatch(client):
    # Create a junior doctor
    emp_resp = client.post("/employees", json={
        "name": "Dr. Junior",
        "role": "Doctor",
        "department": "Emergency",
        "grade": "Junior Doctor"
    })
    emp_id = emp_resp.json()["id"]

    # Create a consultant-only shift
    shift_resp = client.post("/shifts", json={
        "date": "2026-07-03",
        "start_time": "08:00",
        "end_time": "16:00",
        "location": "A&E",
        "required_grade": "Consultant"
    })
    shift_id = shift_resp.json()["id"]

    # Try assigning Junior Doctor to Consultant shift -> expect 400 Grade Mismatch
    assign_resp = client.post("/assignments", json={
        "employee_id": emp_id,
        "shift_id": shift_id
    })
    assert assign_resp.status_code == 400
    assert "Grade mismatch" in assign_resp.json()["detail"]


def test_assignment_compliance_warning_and_override(client, session):
    # Create employee (Band 5 Nurse)
    emp_resp = client.post("/employees", json={
        "name": "Nurse Kelly",
        "role": "Nurse",
        "department": "A&E",
        "grade": "Band 5 Nurse"
    })
    emp_id = emp_resp.json()["id"]

    # Create two shifts on consecutive days with less than 11 hours rest
    # Shift 1: Mon 12:00 - 20:00
    shift1_resp = client.post("/shifts", json={
        "date": "2026-07-06",
        "start_time": "12:00",
        "end_time": "20:00",
        "location": "Ward A",
        "required_grade": "Band 5 Nurse"
    })
    shift1_id = shift1_resp.json()["id"]

    # Shift 2: Tue 06:00 - 14:00 (Starts 10 hours after Shift 1 ends!)
    shift2_resp = client.post("/shifts", json={
        "date": "2026-07-07",
        "start_time": "06:00",
        "end_time": "14:00",
        "location": "Ward B",
        "required_grade": "Band 5 Nurse"
    })
    shift2_id = shift2_resp.json()["id"]

    # Assign Shift 1
    a1_resp = client.post("/assignments", json={"employee_id": emp_id, "shift_id": shift1_id})
    assert a1_resp.status_code == 200

    # Assign Shift 2 -> expects COMPLIANCE_WARNING
    a2_resp = client.post("/assignments", json={"employee_id": emp_id, "shift_id": shift2_id})
    assert a2_resp.status_code == 400
    detail = a2_resp.json()["detail"]
    assert detail["type"] == "COMPLIANCE_WARNING"
    assert "Less than 11 hours rest" in detail["message"]

    # Try to assign Shift 2 with ignore_warnings but missing justification -> expects 400 justification error
    a2_invalid_resp = client.post("/assignments", json={
        "employee_id": emp_id,
        "shift_id": shift2_id,
        "ignore_warnings": True
    })
    assert a2_invalid_resp.status_code == 400
    assert "justification is required" in a2_invalid_resp.json()["detail"]

    # Assign Shift 2 with override and justification -> expects 200
    a2_success_resp = client.post("/assignments", json={
        "employee_id": emp_id,
        "shift_id": shift2_id,
        "ignore_warnings": True,
        "reason_code": "EMERGENCY_OVERRIDE",
        "override_justification": "Ward short-staffed due to sudden clinical escalation."
    })
    assert a2_success_resp.status_code == 200

    # Verify audit log recorded the override details
    audit = session.exec(select(AuditLog).where(AuditLog.action == "EMERGENCY_OVERRIDE")).first()
    assert audit is not None
    assert audit.reason_code == "EMERGENCY_OVERRIDE"
    assert audit.override_justification == "Ward short-staffed due to sudden clinical escalation."


def test_shift_swap_workflow(client, session):
    # 1. Create two Band 5 Nurses
    nurse_a = client.post("/employees", json={"name": "Nurse A", "role": "Nurse", "department": "A&E", "grade": "Band 5 Nurse"}).json()
    nurse_b = client.post("/employees", json={"name": "Nurse B", "role": "Nurse", "department": "A&E", "grade": "Band 5 Nurse"}).json()

    # 2. Create a shift and assign it to Nurse A
    shift = client.post("/shifts", json={
        "date": "2026-07-06",
        "start_time": "08:00",
        "end_time": "16:00",
        "location": "A&E Ward",
        "required_grade": "Band 5 Nurse"
    }).json()
    
    client.post("/assignments", json={"employee_id": nurse_a["id"], "shift_id": shift["id"]})

    # 3. Request a swap
    swap_req_resp = client.post("/assignments/swap-request", json={
        "requesting_employee_id": nurse_a["id"],
        "shift_id": shift["id"]
    })
    assert swap_req_resp.status_code == 200
    swap_id = swap_req_resp.json()["id"]

    # Verify active swap shows up
    active_swaps = client.get("/assignments/swap-requests").json()
    assert len(active_swaps) == 1
    assert active_swaps[0]["id"] == swap_id
    assert active_swaps[0]["requesting_employee_name"] == "Nurse A"

    # 4. Approve swap to Nurse B
    approve_resp = client.post(f"/assignments/swap-request/{swap_id}/approve", json={
        "target_employee_id": nurse_b["id"]
    })
    assert approve_resp.status_code == 200

    # Verify Rota swapped: Nurse B assigned, Nurse A deleted
    assignments = session.exec(select(ShiftAssignment)).all()
    assert len(assignments) == 1
    assert assignments[0].employee_id == nurse_b["id"]

    # Verify swap request resolved
    db_swap = session.get(ShiftSwapRequest, swap_id)
    assert db_swap.status == "APPROVED"
    assert db_swap.target_employee_id == nurse_b["id"]
