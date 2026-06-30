# StaffRota

[![CI](https://github.com/stokie2605/staff-rota/actions/workflows/ci.yml/badge.svg)](https://github.com/stokie2605/staff-rota/actions/workflows/ci.yml)

![StaffRota Screenshot](screenshot.png)

StaffRota is a full-stack shift and rota management web application for operational teams that need a clear weekly staffing view. It is designed around common scheduling use cases in NHS departments, warehouses, call centres, and support teams.

The app lets managers create employees, create shifts, assign staff to shifts, detect same-day assignment conflicts, view a Monday to Sunday rota, and export the weekly rota as a CSV file.

## Tech Stack

- Backend: Python, FastAPI, SQLModel, SQLite
- Frontend: React, Vite, Vanilla CSS
- Containerisation: Docker and Docker Compose
- Backend port: `8000`
- Frontend port: `3000`

## Features

- Employee directory with add and delete actions
- Shift management with date, time, and location fields
- Staff assignment workflow with conflict detection
- Weekly rota grid from Monday to Sunday
- Department colour coding
- CSV export for the selected week
- Seed script with example employees, shifts, and assignments

## Run With Docker Compose

From the project root:

```powershell
docker compose up --build
```

Then open:

```text
http://localhost:3000
```

The backend health check is available at:

```text
http://localhost:8000/health
```

## Run The Seed Script

With the backend container running, open a second terminal from the project root:

```powershell
docker compose exec backend python seed.py
```

Then refresh the frontend at:

```text
http://localhost:3000
```

## API Overview

- `GET /health`
- `POST /employees`
- `GET /employees`
- `DELETE /employees/{id}`
- `POST /shifts`
- `GET /shifts`
- `DELETE /shifts/{id}`
- `POST /assignments`
- `GET /assignments`
- `DELETE /assignments/{id}`
- `GET /rota/week?date=YYYY-MM-DD`
- `GET /rota/export?date=YYYY-MM-DD`

## Conflict Detection

When assigning an employee to a shift, the API checks whether that employee already has a shift on the same date. If they do, the API returns:

```text
Conflict: Employee already assigned to a shift on this date
```

## ✅ Automated Testing

The project includes a `pytest` suite that verifies:
- API health endpoints.
- Employee creation CRUD operations.
- Shift assignment same-day conflict detection logic.
- Weekly CSV rota export formatting and content.

To run the backend tests locally:
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install testing requirements:
   ```bash
   pip install -r requirements.txt -r requirements-dev.txt
   ```
3. Execute `pytest`:
   ```bash
   python -m pytest
   ```

A GitHub Actions CI workflow runs these tests automatically on every push to `main` and `master`.

## Problems Faced & Solved

**Problem 1: Docker port conflict blocking the new container**
When starting the StaffRota stack, requests to `localhost:8000` were silently routing to a previously running container from a different project (the Serverless Support Bot), which was already bound to that port. The new backend container appeared to start successfully but returned unexpected responses.

**Solution:** Identified the conflicting container in Docker Desktop, stopped it explicitly before rebuilding, and confirmed the correct service was responding by checking the `/health` endpoint response format. This reinforced the importance of always verifying which service owns a port before debugging application logic.

---

**Problem 2: Frontend not reaching the backend API across containers**
The React frontend running in its own container was unable to reach `http://localhost:8000` because `localhost` inside a container refers to that container itself, not the host machine.

**Solution:** Kept the frontend API configuration simple for local portfolio review by calling `http://localhost:8000` directly from the browser, while using Docker Compose to run the backend and frontend as separate networked services. This kept the setup straightforward without requiring an nginx reverse proxy or complex container-to-container routing for a local development environment.

---

**Problem 3: CSV export filename not prompting a download in the browser**
The CSV export endpoint returned the correct data but the browser rendered it as plain text rather than triggering a file download.

**Solution:** Added the `Content-Disposition: attachment; filename=rota-export.csv` header to the FastAPI response, which signals to the browser that the response should be saved as a file rather than displayed inline.

---

**Problem 4: Application-only conflict checks were vulnerable to race conditions**
The original shift assignment route checked for existing same-day assignments in Python before committing. Under concurrent requests, two requests could both pass that check before either committed, allowing a double-booking.

**Solution:** Added database-level protection by storing `shift_date` and `shift_slot` on `ShiftAssignment`, enforcing a unique constraint on `employee_id + shift_date`, and catching `IntegrityError` to return a clean `409 Conflict`. This moves the critical invariant from best-effort application logic into the database transaction boundary.
