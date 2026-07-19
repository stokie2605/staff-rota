import React from "react";
import { useRota } from "../context/RotaContext";

export function MySchedule() {
  const { currentUser, assignments, shifts, getLabel } = useRota();

  if (!currentUser) return null;

  // Filter shifts to only those assigned to the current user
  const myAssignments = assignments.filter(a => a.name === currentUser.name);

  // Group by date
  const grouped = {};
  myAssignments.forEach(a => {
    if (!grouped[a.shift_date]) grouped[a.shift_date] = [];
    
    // Find the full shift object to get times and location
    const shift = shifts.find(s => s.id === a.shift_id);
    if (shift) {
      grouped[a.shift_date].push({
        ...a,
        start_time: shift.start_time,
        end_time: shift.end_time,
        location: shift.location
      });
    }
  });

  const dates = Object.keys(grouped).sort();

  return (
    <section style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: "30px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>Welcome, {currentUser.name}</h1>
        <p style={{ color: "var(--text-muted)" }}>Here is your personal agenda.</p>
      </div>

      {dates.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          You have no shifts scheduled for this period.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {dates.map(date => (
            <div key={date} className="panel" style={{ padding: "0", overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ backgroundColor: "var(--surface-2)", padding: "12px 20px", borderBottom: "1px solid var(--border)", fontWeight: "bold" }}>
                {date}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((shift, idx) => (
                  <div key={shift.assignment_id} style={{ 
                    padding: "20px", 
                    borderTop: idx > 0 ? "1px solid var(--border)" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "4px" }}>
                        {shift.start_time} - {shift.end_time}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        {getLabel('location')}: <span style={{ color: "var(--text)", fontWeight: "500" }}>{shift.location}</span>
                      </div>
                    </div>
                    <div>
                      <button className="btn btn-outline" style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
                        Request Swap
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
