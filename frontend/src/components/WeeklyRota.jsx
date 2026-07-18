import { api } from "../services/api";

function getInitials(name) {
  if (!name) return "";
  // Remove clinical prefixes
  const cleanName = name.replace(/^(dr\.|sister|nurse)\s+/i, "");
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDeptClass(location) {
  if (!location) return "";
  return "dept-" + location.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function WeeklyRota({ rota, selectedDate, loading, onPrevious, onNext, onToday, onExport, refresh, stats }) {
  
  async function toggleLocum(shiftId) {
    try {
      await api.toggleLocumPool(shiftId);
      refresh();
    } catch (err) {
      alert("Could not update locum pool status: " + err.message);
    }
  }

  async function requestSwap(employeeId, shiftId) {
    try {
      await api.createSwapRequest({
        requesting_employee_id: employeeId,
        shift_id: shiftId
      });
      alert("Shift swap request posted to the swap board successfully!");
      refresh();
    } catch (err) {
      alert("Could not request swap: " + err.message);
    }
  }

  if (loading || !rota) {
    return <div className="panel loading-panel">Loading rota...</div>;
  }

  return (
    <section className="rota-section">
      <div className="week-toolbar">
        <div>
          <p className="eyebrow">Week commencing</p>
          <h3>{rota.week_start} to {rota.week_end}</h3>
        </div>
        <div className="toolbar-actions">
          <button onClick={onPrevious}>Previous</button>
          <button onClick={onToday}>Today</button>
          <button onClick={onNext}>Next</button>
          <button className="primary-button" onClick={onExport}>Export CSV</button>
        </div>
      </div>
      
      <div className="rota-grid">
        {rota.days.map((day) => (
          <article className="day-column" key={day.date}>
            <div className={day.date === selectedDate ? "day-header selected" : "day-header"}>
              <strong>{day.day}</strong>
              <span>{day.date}</span>
            </div>
            
            <div className="shift-stack">
              {day.shifts.length === 0 && <p className="empty-state">No shifts scheduled</p>}
              {day.shifts.map((shift) => {
                const isUnassigned = shift.staff.length === 0;
                const cardClass = `shift-card ${isUnassigned ? "unassigned-shift" : "assigned-shift"} ${getDeptClass(shift.location)}`;

                return (
                  <div className={cardClass} key={shift.id}>
                    <div className="shift-time">{shift.start_time} - {shift.end_time}</div>
                    <div className="shift-location">{shift.location}</div>
                    
                    {/* Render required grade on card */}
                    <div className="shift-grade" style={{ fontSize: "0.75rem", margin: "4px 0", color: "#64748b" }}>
                      Grade: <span className="pill grade-pill" style={{ fontSize: "0.7rem", padding: "1px 4px" }}>{shift.required_grade}</span>
                    </div>
                    
                    <div className="staff-list" style={{ marginTop: "10px", display: "grid", gap: "6px" }}>
                      {isUnassigned && (
                        <div style={{ display: "grid", gap: "5px" }}>
                          <span className="unassigned" style={{ padding: "4px 8px", borderRadius: "6px", display: "inline-block", fontSize: "0.75rem" }}>Unassigned</span>
                          
                          {/* Offered to locum pool display */}
                          {shift.offered_to_locum_pool && (
                            <div className="locum-offered" style={{ color: "#28a745", fontSize: "0.72rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px" }}>
                              🟢 Locum Pool Active
                            </div>
                          )}
                          
                          {/* Toggle locum pool page button */}
                          <button 
                            className="locum-toggle-btn" 
                            onClick={() => toggleLocum(shift.id)}
                            style={{
                              width: "100%",
                              padding: "4px 8px",
                              fontSize: "0.7rem",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "600",
                              backgroundColor: shift.offered_to_locum_pool ? "#f1f5f9" : "#ffffff"
                            }}
                          >
                            {shift.offered_to_locum_pool ? "Cancel Locum Offer" : "Offer to Locum"}
                          </button>
                        </div>
                      )}
                      
                      {shift.staff.map((person) => (
                        <div 
                          key={person.assignment_id}
                          className="staff-avatar-wrapper"
                          title={`${person.name} (${person.role})`}
                        >
                          {/* Circle Avatar badge with initials */}
                          <div className={`avatar-badge ${getDeptClass(person.department)}`}>
                            {getInitials(person.name)}
                          </div>
                          
                          <span 
                            style={{
                              flexGrow: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.8rem",
                              fontWeight: "500",
                              color: "#334155",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            {person.name.replace(/^(dr\.|sister|nurse)\s+/i, "")}
                            {/* Small Status dot indicator */}
                            <span 
                              className={`status-dot ${person.is_locum ? "locum" : "permanent"}`}
                              title={person.is_locum ? "Locum Staff" : "Permanent Staff"}
                            />
                          </span>
                          
                          {/* Shift swap request trigger */}
                          <button 
                            className="swap-request-btn"
                            onClick={() => requestSwap(person.employee_id, shift.id)}
                            title="Post swap request for this staff"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              padding: "0 2px",
                              flexShrink: 0
                            }}
                          >
                            🔄
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {/* RotaCare Metric KPI Cards Section at the bottom */}
      {stats && (
        <div className="kpi-grid">
          {stats.map((stat) => (
            <div className="kpi-card" key={stat.label}>
              <span className="kpi-label">{stat.label}</span>
              <strong className="kpi-value">{stat.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
