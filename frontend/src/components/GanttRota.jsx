import React, { useState } from "react";
import { useRota } from "../context/RotaContext";

function toInputDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDays(dateText, days) {
  const d = new Date(`${dateText}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

// ─── Main Wrapper ──────────────────────────────────────────────────
export function GanttRota() {
  const { rota, shifts, assignments, selectedDate, setSelectedDate, loading, getLabel, locations } = useRota();
  const [view, setView] = useState("week_grid");
  
  const onPrevious = () => setSelectedDate(addDays(selectedDate, view === 'monthly_matrix' ? -30 : -7));
  const onNext = () => setSelectedDate(addDays(selectedDate, view === 'monthly_matrix' ? 30 : 7));
  const onToday = () => setSelectedDate(toInputDate(new Date()));

  if (loading || !rota || !rota.days) {
    return (
      <div className="gantt-card">
        <div className="gantt-loading">Loading Calendar Canvas...</div>
      </div>
    );
  }

  let renderShifts = shifts || [];
  let renderAssigns = assignments || [];
  let renderLocations = locations || [];

  // Inject hardcoded SaaS Demo data if backend is empty
  if (renderShifts.length === 0) {
    const todayStr = toInputDate(new Date());
    renderLocations = ["Chair 1", "Chair 2", "Chair 3", "Hygiene A", "Consultation B"];
    renderShifts = [
      { id: 101, date: todayStr, start_time: "08:00", end_time: "12:00", location: "Chair 1", required_grade: "Dentist", is_published: true },
      { id: 102, date: todayStr, start_time: "13:00", end_time: "17:00", location: "Chair 1", required_grade: "Dentist", is_published: true },
      { id: 103, date: todayStr, start_time: "09:00", end_time: "15:00", location: "Chair 2", required_grade: "Orthodontist", is_published: true },
      { id: 104, date: todayStr, start_time: "08:30", end_time: "16:30", location: "Hygiene A", required_grade: "Hygienist", is_published: true },
      { id: 105, date: addDays(todayStr, 1), start_time: "10:00", end_time: "18:00", location: "Chair 3", required_grade: "Dentist", is_published: true },
      { id: 106, date: addDays(todayStr, 1), start_time: "09:00", end_time: "14:00", location: "Consultation B", required_grade: "Nurse", is_published: true },
      { id: 107, date: addDays(todayStr, 2), start_time: "07:00", end_time: "19:00", location: "Chair 1", required_grade: "Dentist", is_published: true },
      { id: 108, date: addDays(todayStr, 2), start_time: "08:00", end_time: "16:00", location: "Hygiene A", required_grade: "Hygienist", is_published: true },
      { id: 109, date: addDays(todayStr, -1), start_time: "08:00", end_time: "18:00", location: "Chair 2", required_grade: "Dentist", is_published: true },
      { id: 110, date: addDays(todayStr, 3), start_time: "09:00", end_time: "17:00", location: "Chair 3", required_grade: "Dentist", is_published: false },
      { id: 111, date: addDays(todayStr, 5), start_time: "10:00", end_time: "16:00", location: "Consultation B", required_grade: "Nurse", is_published: true },
      { id: 112, date: addDays(todayStr, 10), start_time: "08:00", end_time: "14:00", location: "Chair 1", required_grade: "Dentist", is_published: true },
      { id: 113, date: addDays(todayStr, 15), start_time: "09:00", end_time: "17:00", location: "Chair 2", required_grade: "Orthodontist", is_published: true },
      { id: 114, date: addDays(todayStr, -5), start_time: "08:00", end_time: "16:00", location: "Hygiene A", required_grade: "Hygienist", is_published: true },
      { id: 115, date: addDays(todayStr, 20), start_time: "10:00", end_time: "18:00", location: "Consultation B", required_grade: "Nurse", is_published: true },
    ];
    renderAssigns = [
      { shift_id: 101, name: "Dr. Sarah Jenkins", role: "Dentist" },
      { shift_id: 102, name: "Dr. Sarah Jenkins", role: "Dentist" },
      { shift_id: 103, name: "Dr. Ahmed Khan", role: "Orthodontist" },
      { shift_id: 104, name: "Chloe Evans", role: "Hygienist" },
      { shift_id: 105, name: "Dr. Emily Chen", role: "Dentist" },
      { shift_id: 106, name: "Nurse Thompson", role: "Nurse" },
      { shift_id: 107, name: "Dr. Sarah Jenkins", role: "Dentist" },
      { shift_id: 109, name: "Dr. Ahmed Khan", role: "Dentist" },
      { shift_id: 111, name: "Nurse Thompson", role: "Nurse" },
      { shift_id: 112, name: "Dr. Emily Chen", role: "Dentist" },
    ];
  }

  return (
    <div className="gantt-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* View Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            ["week_grid", "Weekly Grid"],
            ["daily_vertical", "Daily Vertical"],
            ["monthly_matrix", "Monthly Matrix"]
          ].map(([v, label]) => (
            <button
              key={v}
              className={`btn ${view === v ? "btn-primary" : "btn-outline"}`}
              style={{ padding: "8px 16px", fontSize: "0.9rem" }}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={onPrevious}>‹</button>
          <span style={{ fontWeight: "bold", fontSize: "1rem", color: "var(--text)" }}>
            {view === "monthly_matrix" 
              ? new Date(selectedDate).toLocaleString('default', { month: 'long', year: 'numeric' })
              : view === "daily_vertical"
              ? selectedDate
              : `${rota.week_start} – ${rota.week_end}`
            }
          </span>
          <button className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={onNext}>›</button>
          <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={onToday}>Today</button>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
        {view === "week_grid" && <WeeklyGrid rota={rota} shifts={renderShifts} assignments={renderAssigns} locations={renderLocations} getLabel={getLabel} />}
        {view === "daily_vertical" && <DailyVertical selectedDate={selectedDate} shifts={renderShifts} assignments={renderAssigns} locations={renderLocations} getLabel={getLabel} />}
        {view === "monthly_matrix" && <MonthlyMatrix selectedDate={selectedDate} shifts={renderShifts} assignments={renderAssigns} />}
      </div>
    </div>
  );
}

// ─── 1. Weekly Mode Grid ───────────────────────────────────────────
function WeeklyGrid({ rota, shifts, assignments, locations, getLabel }) {
  const days = rota?.days || [];
  
  return (
    <div style={{ overflowX: "auto", overflowY: "auto", width: "100%", height: "calc(100vh - 180px)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", left: 0, top: 0, zIndex: 10, background: "var(--surface-2)", padding: "16px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
              {getLabel("location")}
            </th>
            {days.map(d => (
              <th key={d.date} style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--surface-2)", padding: "16px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ color: "var(--text)", fontWeight: "bold" }}>{d.day}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "normal" }}>{d.date.slice(5)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(locations || []).map(ward => (
            <tr key={ward}>
              <td style={{ position: "sticky", left: 0, zIndex: 5, background: "var(--surface-2)", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", padding: "16px", fontWeight: "bold", color: "var(--text)", minWidth: "180px" }}>
                {ward}
              </td>
              {days.map(d => {
                const dayShifts = (shifts || []).filter(s => s.date === d.date && s.location === ward);
                return (
                  <td key={d.date} style={{ borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", padding: "12px", verticalAlign: "top", background: "var(--surface)" }}>
                    {dayShifts.length === 0 && (
                      <div style={{ border: "2px dashed var(--border)", padding: "20px", textAlign: "center", borderRadius: "8px", color: "var(--text-faint)", cursor: "pointer" }}>
                        +
                      </div>
                    )}
                    {dayShifts.map(shift => {
                      const assigns = (assignments || []).filter(a => a.shift_id === shift.id);
                      const isUnassigned = assigns.length === 0;
                      return (
                        <div key={shift.id} style={{ 
                          border: isUnassigned ? "1px dashed var(--critical)" : "1px solid var(--border)",
                          background: isUnassigned ? "var(--critical-bg)" : "var(--surface-2)",
                          borderRadius: "8px",
                          padding: "12px",
                          marginBottom: "12px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                        }}>
                          <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text)", marginBottom: "8px" }}>
                            {shift.start_time} - {shift.end_time}
                          </div>
                          
                          {isUnassigned ? (
                            <div style={{ display: "inline-block", background: "var(--critical)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>
                              ⚠️ Unassigned
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {assigns.map(a => (
                                <div key={a.assignment_id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)" }}></div>
                                  <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>{a.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                            {shift.required_grade}
                          </div>
                        </div>
                      )
                    })}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 2. Daily Vertical Calendar Mode ───────────────────────────────
function DailyVertical({ selectedDate, shifts, assignments, locations, getLabel }) {
  const dailyShifts = (shifts || []).filter(s => s.date === selectedDate);
  const START_HR = 6;
  const END_HR = 24;
  const HOURS = END_HR - START_HR;
  
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes() - (START_HR * 60);
  const showNow = currentMins >= 0 && currentMins <= (HOURS * 60);
  const nowPct = (currentMins / (HOURS * 60)) * 100;

  return (
    <div style={{ display: "flex", overflowX: "auto", overflowY: "auto", height: "calc(100vh - 180px)", width: "100%", background: "var(--surface)" }}>
      {/* Time Axis (Left) */}
      <div style={{ minWidth: "70px", borderRight: "1px solid var(--border)", position: "sticky", left: 0, zIndex: 20, background: "var(--surface)" }}>
        <div style={{ height: "50px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", position: "sticky", top: 0, zIndex: 30 }}></div> {/* Header spacer */}
        <div style={{ position: "relative", height: "1200px" }}>
          {Array.from({length: HOURS + 1}).map((_, i) => (
            <div key={i} style={{ position: "absolute", top: `${(i / HOURS) * 100}%`, transform: "translateY(-50%)", width: "100%", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
              {String(START_HR + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>

      {/* Location Columns */}
      <div style={{ display: "flex", flex: 1, minWidth: "max-content", position: "relative" }}>
        {(locations || []).map(ward => {
          const wShifts = dailyShifts.filter(s => s.location === ward);
          return (
            <div key={ward} style={{ flex: 1, minWidth: "200px", borderRight: "1px solid var(--border)" }}>
              <div style={{ position: "sticky", top: 0, zIndex: 10, height: "50px", borderBottom: "1px solid var(--border)", padding: "14px", textAlign: "center", fontWeight: "bold", background: "var(--surface-2)", color: "var(--text)" }}>
                {ward}
              </div>
              <div style={{ position: "relative", height: "1200px", background: "var(--surface)" }}>
                {/* Horizontal Gridlines */}
                {Array.from({length: HOURS}).map((_, i) => (
                  <div key={i} style={{ position: "absolute", top: `${(i / HOURS) * 100}%`, width: "100%", height: "1px", background: "var(--border)" }}></div>
                ))}

                {/* Vertical Blocks */}
                {wShifts.map(shift => {
                  const [sh, sm] = shift.start_time.split(":").map(Number);
                  let [eh, em] = shift.end_time.split(":").map(Number);
                  
                  if (eh <= sh) eh = 24; // cap overnight at midnight
                  if (eh > 24) eh = 24;
                  
                  const startMins = Math.max(0, (sh * 60 + sm) - (START_HR * 60));
                  const endMins = Math.min(HOURS * 60, (eh * 60 + em) - (START_HR * 60));
                  if (endMins <= startMins) return null;

                  const top = (startMins / (HOURS * 60)) * 100;
                  const height = ((endMins - startMins) / (HOURS * 60)) * 100;

                  const assigns = (assignments || []).filter(a => a.shift_id === shift.id);
                  const isUnassigned = assigns.length === 0;
                  
                  return (
                    <div key={shift.id} style={{ 
                      position: "absolute", top: `${top}%`, height: `${height}%`, left: "8px", right: "8px", 
                      background: isUnassigned ? "var(--critical-bg)" : "var(--primary-light)",
                      border: isUnassigned ? "2px dashed var(--critical)" : "1px solid var(--primary)",
                      borderRadius: "8px", padding: "8px", overflow: "hidden",
                      color: "var(--text)",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                    }}>
                      <div style={{ fontWeight: "bold", fontSize: "0.85rem", marginBottom: "4px" }}>{shift.start_time} - {shift.end_time}</div>
                      <div style={{ fontSize: "0.8rem" }}>
                        {isUnassigned ? "⚠️ Unassigned" : assigns.map(a => a.name).join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        })}

        {/* Global Tracker Line */}
        {showNow && (
          <div style={{ position: "absolute", top: `calc(50px + ${nowPct}%)`, left: 0, right: 0, height: "2px", background: "var(--critical)", pointerEvents: "none", zIndex: 20 }}>
            <div style={{ position: "absolute", left: "-6px", top: "-5px", width: "12px", height: "12px", background: "var(--critical)", borderRadius: "50%" }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 3. Monthly Matrix Mode ────────────────────────────────────────
function MonthlyMatrix({ selectedDate, shifts, assignments }) {
  const current = new Date(selectedDate);
  const year = current.getFullYear();
  const month = current.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday is 0
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  
  const calendarCells = [];
  for (let i = 0; i < totalCells; i++) {
    calendarCells.push(new Date(year, month, i - startOffset + 1));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", overflowY: "auto", overflowX: "auto" }}>
      {/* Days of Week Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
          <div key={day} style={{ padding: "12px", textAlign: "center", fontWeight: "bold", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(140px, 1fr)", flex: 1, background: "var(--border)", gap: "1px" }}>
        {calendarCells.map((d, idx) => {
          const isCurrentMonth = d.getMonth() === month;
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          const dShifts = (shifts || []).filter(s => s.date === dateStr);
          let unassignedCount = 0;
          const roleCounts = {};
          
          dShifts.forEach(s => {
            const assigns = (assignments || []).filter(a => a.shift_id === s.id);
            if (assigns.length === 0) unassignedCount++;
            else {
              assigns.forEach(a => {
                const roleName = a.role || a.grade || "Staff";
                roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
              });
            }
          });

          return (
            <div key={idx} style={{ 
              background: isCurrentMonth ? "var(--surface)" : "var(--surface-2)", 
              padding: "12px", 
              minHeight: "120px", 
              opacity: isCurrentMonth ? 1 : 0.4 
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <strong style={{ fontSize: "1.1rem", color: dateStr === selectedDate ? "var(--primary)" : "var(--text)" }}>
                  {d.getDate()}
                </strong>
                {unassignedCount > 0 && (
                  <span title={`${unassignedCount} unassigned`} style={{ color: "var(--critical)", fontSize: "1rem" }}>⚠️</span>
                )}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(roleCounts).map(([roleName, count]) => (
                  <div key={roleName} style={{ 
                    fontSize: "0.75rem", 
                    background: "var(--primary-light)", 
                    color: "var(--primary)",
                    padding: "4px 8px", 
                    borderRadius: "6px", 
                    display: "flex", 
                    justifyContent: "space-between",
                    fontWeight: "600"
                  }}>
                    <span>{roleName}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
