import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { api, downloadRotaCsv } from "./services/api";
import { Sidebar } from "./components/Sidebar";
import { PageHeader } from "./components/PageHeader";
import { EmployeePage } from "./components/EmployeePage";
import { ShiftPage } from "./components/ShiftPage";
import { AssignmentPage } from "./components/AssignmentPage";
import { WeeklyRota } from "./components/WeeklyRota";
import { SwapPage } from "./components/SwapPage";
import { AuditPage } from "./components/AuditPage";

const views = {
  rota: "Weekly Rota",
  employees: "Employees",
  shifts: "Shifts",
  assignments: "Assign Staff",
  swaps: "Shift Swap Board",
  audit: "Compliance Audit Logs"
};

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

function App() {
  const [activeView, setActiveView] = useState("rota");
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [rota, setRota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState("admin"); // 'admin' or 'staff'

  const stats = useMemo(() => {
    const unfilledShifts = shifts.filter(s => !assignments.some(a => a.shift_id === s.id));
    const locumOffers = shifts.filter(s => s.offered_to_locum_pool && !assignments.some(a => a.shift_id === s.id));
    const locumStaff = employees.filter(e => e.is_locum);

    return [
      { label: "Employees", value: employees.length },
      { label: "Locum Pool", value: locumStaff.length },
      { label: "Unfilled Wards", value: unfilledShifts.length },
      { label: "Locum Offers", value: locumOffers.length }
    ];
  }, [employees, shifts, assignments]);

  async function refreshAll() {
    setLoading(true);
    setError("");
    try {
      const [employeeData, shiftData, assignmentData, rotaData] = await Promise.all([
        api.getEmployees(),
        api.getShifts(),
        api.getAssignments(),
        api.getWeek(selectedDate)
      ]);
      setEmployees(employeeData);
      setShifts(shiftData);
      setAssignments(assignmentData);
      setRota(rotaData);
    } catch (err) {
      setError("Failed to load roster data. The backend server may be waking up from cold start.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, [selectedDate]);

  // If role is changed to staff, force activeView back to rota
  useEffect(() => {
    if (role === "staff") {
      setActiveView("rota");
    }
  }, [role]);

  async function handleExport() {
    await downloadRotaCsv(selectedDate);
  }

  const title = views[activeView];

  return (
    <div className="app-shell">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        role={role} 
        setRole={setRole} 
      />
      <main className="main-content">
        <PageHeader title={title} notice={notice} setNotice={setNotice} />
        
        {activeView === "rota" && (
          error ? (
            <div className="panel" style={{ textAlign: "center", padding: "40px", maxWidth: "500px", margin: "40px auto" }}>
              <h3 style={{ color: "#ef4444", marginBottom: "10px" }}>⚠️ Connection Notice</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "20px", lineHeight: "1.5" }}>
                {error}
              </p>
              <button className="primary-button" onClick={refreshAll}>
                Retry Connection
              </button>
            </div>
          ) : (
            <WeeklyRota
              rota={rota}
              selectedDate={selectedDate}
              loading={loading}
              onPrevious={() => setSelectedDate(addDays(selectedDate, -7))}
              onNext={() => setSelectedDate(addDays(selectedDate, 7))}
              onToday={() => setSelectedDate(toInputDate(new Date()))}
              onExport={handleExport}
              refresh={refreshAll}
              stats={stats}
              role={role}
            />
          )
        )}

        {activeView === "employees" && role === "admin" && (
          <EmployeePage employees={employees} refresh={refreshAll} setNotice={setNotice} />
        )}
        {activeView === "shifts" && role === "admin" && (
          <ShiftPage shifts={shifts} refresh={refreshAll} setNotice={setNotice} />
        )}
        {activeView === "assignments" && role === "admin" && (
          <AssignmentPage
            employees={employees}
            shifts={shifts}
            assignments={assignments}
            refresh={refreshAll}
            setNotice={setNotice}
          />
        )}
        {activeView === "swaps" && role === "admin" && (
          <SwapPage
            employees={employees}
            refresh={refreshAll}
            setNotice={setNotice}
          />
        )}
        {activeView === "audit" && role === "admin" && <AuditPage />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
