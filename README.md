# StaffRota

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

## Problems Faced & Solved

<!-- Add notes here about the main issues you faced while building StaffRota and how you solved them. -->
