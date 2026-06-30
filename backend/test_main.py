import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from database import get_session
from main import app
from models import Employee, Shift, ShiftAssignment

# Setup test database file
TEST_DB_FILE = "./test_staffrota.db"
sqlite_url = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def override_get_session():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = override_get_session

@pytest.fixture(name="session", scope="function", autouse=True)
def session_fixture():
    # Cleanup any old test db files
    if Path(TEST_DB_FILE).exists():
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass
            
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)
    
    # Cleanup test db file
    if Path(TEST_DB_FILE).exists():
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_employee():
    payload = {
        "name": "Jane Doe",
        "role": "Nurse",
        "department": "A&E"
    }
    response = client.post("/employees", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Jane Doe"
    assert data["id"] is not None

def test_create_shift_and_conflict():
    # 1. Create employee
    employee_response = client.post("/employees", json={
        "name": "Alice Smith",
        "role": "Doctor",
        "department": "Cardiology"
    })
    emp_id = employee_response.json()["id"]

    # 2. Create two shifts on the same day
    shift1_response = client.post("/shifts", json={
        "date": "2026-07-01",
        "start_time": "08:00",
        "end_time": "16:00",
        "location": "Ward A"
    })
    shift1_id = shift1_response.json()["id"]

    shift2_response = client.post("/shifts", json={
        "date": "2026-07-01",
        "start_time": "16:00",
        "end_time": "23:59",
        "location": "Ward B"
    })
    shift2_id = shift2_response.json()["id"]

    # 3. Create first assignment
    assign1_response = client.post("/assignments", json={
        "employee_id": emp_id,
        "shift_id": shift1_id
    })
    assert assign1_response.status_code == 200

    # 4. Attempt to create second assignment on the same day (conflict!)
    assign2_response = client.post("/assignments", json={
        "employee_id": emp_id,
        "shift_id": shift2_id
    })
    assert assign2_response.status_code == 400
    assert "Conflict" in assign2_response.json()["detail"]

def test_export_rota_csv():
    # Create employee & shift
    employee_response = client.post("/employees", json={"name": "Bob", "role": "Staff", "department": "HQ"})
    emp_id = employee_response.json()["id"]
    
    shift_response = client.post("/shifts", json={
        "date": "2026-07-01",
        "start_time": "09:00",
        "end_time": "17:00",
        "location": "HQ Desk"
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
