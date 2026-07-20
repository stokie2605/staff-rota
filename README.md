# RotaCare

RotaCare is a full-stack, industry-agnostic healthcare staff scheduling platform designed to streamline shift management, track staff hours, and manage absences seamlessly.

## 🚀 Key Features

- **Interactive Gantt Rota:** Visual scheduling across three modes (Weekly Grid, Daily Vertical, Monthly Matrix) featuring intuitive drag-and-drop mechanics with precision 15-minute timeblock snapping.
- **Staff Directory & Live Overtime Tracking:** Comprehensive staff management dashboard that calculates scheduled hours in real-time and dynamically flags overtime against contracted hours.
- **Absence Management & Conflict Detection:** Robust leave management dashboard featuring real-time calendar interceptions that automatically inject highly visible `⚠️ CONFLICT: ON LEAVE` alert badges onto overlapping shift cards.
- **Export & Print Capabilities:** One-click CSV generation for data auditing and fully automated `@media print` CSS overrides that strip away UI elements to produce crisp, high-contrast black-and-white physical printouts for breakrooms.
- **Full Database Persistence:** Wired into a high-performance backend, ensuring secure persistence of all mutations (shifts, assignments, staff, absences) alongside an intelligent optimistic UI architecture that gracefully falls back to offline local storage if network connectivity drops.

<div align="center">
  <img src="docs/rota week.png" width="750" alt="RotaCare Preview" />
</div>

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Vanilla CSS / Tailwind CSS
- **Backend:** FastAPI, SQLModel
- **Database:** SQLite

## 🏁 Getting Started

### Prerequisites
Ensure you have Node.js and Python installed on your local machine.

### Frontend Setup

1. Navigate into the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate into the backend directory:
   ```bash
   cd backend
   ```
2. Install the Python requirements (ideally within a virtual environment):
   ```bash
   pip install -r requirements.txt
   ```
3. Boot the FastAPI application:
   ```bash
   uvicorn main:app --reload
   ```

## 🗺️ Project Roadmap Status

- [x] **Step 1: Interactivity & Core Shift Workflows** - 100% Complete
- [x] **Step 2: Staff, Absences & Export (The Polish)** - 100% Complete
- [x] **Step 3: Full Database Persistence** - 100% Complete
- [ ] *Future roadmap steps pending...*
