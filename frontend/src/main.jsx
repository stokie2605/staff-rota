import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { api, downloadRotaCsv } from "./services/api";
import { TopNav }         from "./components/TopNav";
import { Sidebar }        from "./components/Sidebar";
import { NeedsAttention } from "./components/NeedsAttention";
import { GanttRota }      from "./components/GanttRota";
import { EmployeePage }   from "./components/EmployeePage";
import { ShiftPage }      from "./components/ShiftPage";
import { AssignmentPage } from "./components/AssignmentPage";
import { SwapPage }       from "./components/SwapPage";
import { AuditPage }      from "./components/AuditPage";

function toInputDate(d) { return d.toISOString().slice(0, 10); }
function addDays(dateText, days) {
  const d = new Date(`${dateText}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

function App() {
  const [activeView, setActiveView]  = useState("dashboard");
  const [activeTab,  setActiveTab]   = useState("Dashboard");
  const [role,       setRole]        = useState("admin");
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));

  const [employees,    setEmployees]    = useState([]);
  const [shifts,       setShifts]       = useState([]);
  const [assignments,  setAssignments]  = useState([]);
  const [rota,         setRota]         = useState(null);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [notice,       setNotice]       = useState("");

  async function refreshAll() {
    setLoading(true);
    setError("");
    try {
      const [empData, shiftData, asnData, rotaData, swapData] = await Promise.all([
        api.getEmployees(),
        api.getShifts(),
        api.getAssignments(),
        api.getWeek(selectedDate),
        api.getSwapRequests().catch(() => [])
      ]);
      setEmployees(empData);
      setShifts(shiftData);
      setAssignments(asnData);
      setRota(rotaData);
      setSwapRequests(swapData);
    } catch (err) {
      setError("Backend is waking up from sleep. Please retry in a moment.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshAll(); }, [selectedDate]);

  // Reset to dashboard view when switching to staff role
  useEffect(() => {
    if (role === "staff") setActiveView("dashboard");
  }, [role]);

  const stats = useMemo(() => {
    const unfilled = shifts.filter(s => !assignments.some(a => a.shift_id === s.id));
    const locums   = employees.filter(e => e.is_locum);
    return [
      { label: "Employees",      value: employees.length },
      { label: "Locum Pool",     value: locums.length },
      { label: "Unfilled Wards", value: unfilled.length },
      { label: "Locum Offers",   value: shifts.filter(s => s.offered_to_locum_pool).length },
    ];
  }, [employees, shifts, assignments]);

  const isAdmin = role === "admin";

  return (
    <div className="app-shell">
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="app-body">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          role={role}
          setRole={setRole}
        />

        <main className="main-content">
          {/* Notice banner */}
          {notice && (
            <div className="notice-banner">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
            </div>
          )}

          {/* Error state */}
          {error && activeView === "dashboard" && (
            <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>{error}</p>
              <button className="primary-button" onClick={refreshAll}>Retry Connection</button>
            </div>
          )}

          {/* Dashboard view */}
          {activeView === "dashboard" && !error && (
            <>
              <NeedsAttention
                rota={rota}
                swapRequests={swapRequests}
                employees={employees}
                selectedDate={selectedDate}
                onNavigate={setActiveView}
                refresh={refreshAll}
              />

              <GanttRota
                rota={rota}
                selectedDate={selectedDate}
                loading={loading}
                onPrevious={() => setSelectedDate(addDays(selectedDate, -7))}
                onNext={() => setSelectedDate(addDays(selectedDate, 7))}
                onToday={() => setSelectedDate(toInputDate(new Date()))}
                refresh={refreshAll}
                role={role}
              />

              {/* KPI row */}
              <div className="kpi-grid">
                {stats.map(stat => (
                  <div className="kpi-card" key={stat.label}>
                    <span className="kpi-label">{stat.label}</span>
                    <strong className="kpi-value">{stat.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Roster view (Gantt only) */}
          {activeView === "roster" && (
            <GanttRota
              rota={rota}
              selectedDate={selectedDate}
              loading={loading}
              onPrevious={() => setSelectedDate(addDays(selectedDate, -7))}
              onNext={() => setSelectedDate(addDays(selectedDate, 7))}
              onToday={() => setSelectedDate(toInputDate(new Date()))}
              refresh={refreshAll}
              role={role}
            />
          )}

          {/* Admin-only views */}
          {activeView === "staff" && isAdmin && (
            <EmployeePage employees={employees} refresh={refreshAll} setNotice={setNotice} />
          )}
          {activeView === "assignments" && isAdmin && (
            <AssignmentPage
              employees={employees}
              shifts={shifts}
              assignments={assignments}
              refresh={refreshAll}
              setNotice={setNotice}
            />
          )}
          {activeView === "shifts" && isAdmin && (
            <ShiftPage shifts={shifts} refresh={refreshAll} setNotice={setNotice} />
          )}
          {activeView === "swaps" && isAdmin && (
            <SwapPage employees={employees} refresh={refreshAll} setNotice={setNotice} />
          )}
          {activeView === "audit" && isAdmin && <AuditPage />}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
