import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import { ToastProvider, useToast } from "./context/ToastContext";
import { RotaProvider, useRota } from "./context/RotaContext";

import { TopNav }         from "./components/TopNav";
import { Sidebar }        from "./components/Sidebar";
import { NeedsAttention } from "./components/NeedsAttention";
import { GanttRota }      from "./components/GanttRota";
import { EmployeePage }   from "./components/EmployeePage";
import { ShiftPage }      from "./components/ShiftPage";
import { AssignmentPage } from "./components/AssignmentPage";
import { SwapPage }       from "./components/SwapPage";
import { AuditPage }      from "./components/AuditPage";
import { LocationPage }   from "./components/LocationPage";
import { AbsencePage }    from "./components/AbsencePage";

function AppContent() {
  const [activeView, setActiveView]  = useState("dashboard");
  const [role,       setRole]        = useState("admin");
  const [searchQuery,  setSearchQuery]  = useState("");

  const { 
    employees, shifts, assignments, loading, backendOk, refreshAll
  } = useRota();

  const isAdmin = role === "admin";

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

  // Reset to dashboard view when switching to staff role
  React.useEffect(() => {
    if (role === "staff") setActiveView("dashboard");
  }, [role]);

  return (
    <div className="app-shell">
      <TopNav
        onNavigate={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        role={role}
      />

      <div className="app-body">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          role={role}
          setRole={setRole}
        />

        <main className="main-content">
          {!backendOk && activeView === "dashboard" && (
            <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>Backend is waking up from sleep. Please retry in a moment.</p>
              <button className="btn btn-primary" onClick={refreshAll}>Retry Connection</button>
            </div>
          )}

          {/* Dashboard view */}
          {activeView === "dashboard" && backendOk && (
            <>
              <NeedsAttention onNavigate={setActiveView} />

              <GanttRota
                role={role}
                searchQuery={searchQuery}
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
            <GanttRota role={role} searchQuery={searchQuery} />
          )}

          {/* Admin-only views */}
          {activeView === "staff" && isAdmin && <EmployeePage />}
          {activeView === "assignments" && isAdmin && <AssignmentPage />}
          {activeView === "shifts" && isAdmin && <ShiftPage />}
          {activeView === "swaps" && isAdmin && <SwapPage />}
          {activeView === "locations" && <LocationPage onNavigate={setActiveView} />}
          {activeView === "absences" && isAdmin && <AbsencePage />}
          {activeView === "audit" && isAdmin && <AuditPage />}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <RotaProvider>
        <AppContent />
      </RotaProvider>
    </ToastProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
