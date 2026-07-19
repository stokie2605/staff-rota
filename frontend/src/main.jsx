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
import { ReportsPage }    from "./components/ReportsPage";
import { LoginPage }      from "./components/LoginPage";
import { MySchedule }     from "./components/MySchedule";

function AppContent() {
  const [activeView, setActiveView]  = useState("dashboard");
  const [searchQuery,  setSearchQuery]  = useState("");

  const { 
    employees, shifts, assignments, loading, backendOk, refreshAll, currentUser
  } = useRota();

  if (!currentUser) {
    return <LoginPage />;
  }

  const isAdmin = currentUser.role === "admin";

  const stats = useMemo(() => {
    const s = shifts || [];
    const a = assignments || [];
    const e = employees || [];
    const unfilled = s.filter(shift => !a.some(assign => assign.shift_id === shift.id));
    const locums   = e.filter(emp => emp.is_locum);
    return [
      { label: "Employees",      value: e.length },
      { label: "Locum Pool",     value: locums.length },
      { label: "Unfilled Wards", value: unfilled.length },
      { label: "Locum Offers",   value: s.filter(shift => shift.offered_to_locum_pool).length },
    ];
  }, [employees, shifts, assignments]);

  return (
    <div className="app-shell">
      <TopNav
        onNavigate={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        role={currentUser.role}
      />

      <div className="app-body">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          role={currentUser.role}
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
            isAdmin ? (
              <>
                <NeedsAttention onNavigate={setActiveView} />

                <GanttRota
                  role={currentUser.role}
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
            ) : (
              <MySchedule />
            )
          )}

          {/* Roster view (Gantt only) */}
          {activeView === "roster" && (
            <GanttRota role={currentUser.role} searchQuery={searchQuery} />
          )}

          {/* Admin-only views */}
          {activeView === "staff" && isAdmin && <EmployeePage />}
          {activeView === "assignments" && isAdmin && <AssignmentPage />}
          {activeView === "shifts" && isAdmin && <ShiftPage />}
          {activeView === "swaps" && isAdmin && <SwapPage />}
          {activeView === "locations" && <LocationPage onNavigate={setActiveView} />}
          {activeView === "absences" && isAdmin && <AbsencePage />}
          {activeView === "reports" && isAdmin && <ReportsPage />}
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
