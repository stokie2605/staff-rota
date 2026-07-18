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
  const [notice, setNotice] = useState("");

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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, [selectedDate]);

  async function handleExport() {
    await downloadRotaCsv(selectedDate);
  }

  const title = views[activeView];

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="main-content">
        <PageHeader title={title} notice={notice} setNotice={setNotice} />
        {activeView === "rota" && (
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
          />
        )}
        {activeView === "employees" && (
          <EmployeePage employees={employees} refresh={refreshAll} setNotice={setNotice} />
        )}
        {activeView === "shifts" && <ShiftPage shifts={shifts} refresh={refreshAll} setNotice={setNotice} />}
        {activeView === "assignments" && (
          <AssignmentPage
            employees={employees}
            shifts={shifts}
            assignments={assignments}
            refresh={refreshAll}
            setNotice={setNotice}
          />
        )}
        {activeView === "swaps" && (
          <SwapPage
            employees={employees}
            refresh={refreshAll}
            setNotice={setNotice}
          />
        )}
        {activeView === "audit" && <AuditPage />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
