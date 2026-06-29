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

const views = {
  rota: "Weekly Rota",
  employees: "Employees",
  shifts: "Shifts",
  assignments: "Assign Staff"
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
    return [
      { label: "Employees", value: employees.length },
      { label: "Shifts", value: shifts.length },
      { label: "Assignments", value: assignments.length }
    ];
  }, [employees.length, shifts.length, assignments.length]);

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
      <Sidebar activeView={activeView} setActiveView={setActiveView} stats={stats} />
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
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
