import { api } from "../services/api";

function departmentClass(department) {
  const value = department.toLowerCase().replaceAll(" ", "-");
  return `dept-${value}`;
}

export function WeeklyRota({ rota, selectedDate, loading, onPrevious, onNext, onToday, onExport, refresh }) {
  
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
              {day.shifts.length === 0 && <p className="empty-state">No shifts</p>}
              {day.shifts.map((shift) => (
                <div className="shift-card" key={shift.id} style={{ position: "relative" }}>
                  <div className="shift-time">{shift.start_time} - {shift.end_time}</div>
                  <div className="shift-location">{shift.location}</div>
                  
                  {/* Render required grade on card */}
                  <div className="shift-grade" style={{ fontSize: "0.8rem", margin: "4px 0", color: "#666" }}>
                    Grade: <span className="pill grade-pill" style={{ display: "inline-block", fontSize: "0.75rem", padding: "1px 6px" }}>{shift.required_grade}</span>
                  </div>
                  
                  <div className="staff-list" style={{ marginTop: "10px" }}>
                    {shift.staff.length === 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <span className="unassigned" style={{ display: "block", marginBottom: "5px" }}>Unassigned</span>
                        
                        {/* Offered to locum pool display */}
                        {shift.offered_to_locum_pool && (
                          <div className="locum-offered" style={{ color: "#28a745", fontSize: "0.75rem", fontWeight: "600", marginBottom: "8px" }}>
                            🔊 Locum Pool Offered
                          </div>
                        )}
                        
                        {/* Toggle locum pool page button */}
                        <button 
                          className="locum-toggle-btn" 
                          onClick={() => toggleLocum(shift.id)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "3px 8px",
                            fontSize: "0.7rem",
                            border: "1px dashed #bbb",
                            borderRadius: "4px",
                            cursor: "pointer",
                            backgroundColor: shift.offered_to_locum_pool ? "#f8f9fa" : "#e9ecef"
                          }}
                        >
                          {shift.offered_to_locum_pool ? "Cancel Locum Offer" : "Offer to Locum Pool"}
                        </button>
                      </div>
                    )}
                    
                    {shift.staff.map((person) => (
                      <div 
                        key={person.assignment_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                          width: "100%",
                          gap: "4px"
                        }}
                      >
                        <span 
                          className={`staff-chip ${departmentClass(person.department)}`}
                          style={{
                            flexGrow: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "inline-block",
                            textAlign: "left",
                            paddingRight: "6px"
                          }}
                          title={`${person.name}${person.is_locum ? " (Locum)" : ""}`}
                        >
                          {person.name}
                          {person.is_locum && (
                            <span 
                              className="locum-tag" 
                              style={{
                                fontSize: "0.55rem",
                                backgroundColor: "#ffc107",
                                color: "#212529",
                                padding: "1px 3px",
                                borderRadius: "3px",
                                fontWeight: "700",
                                marginLeft: "4px",
                                display: "inline-block",
                                verticalAlign: "middle"
                              }}
                            >
                              LOCUM
                            </span>
                          )}
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
                            fontSize: "0.85rem",
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
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
