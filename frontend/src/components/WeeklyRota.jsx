import { useRef, useState, useCallback } from "react";
import { api } from "../services/api";

function getInitials(name) {
  if (!name) return "";
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

/* ─── Staff Popover ───────────────────────────────────────────────── */
function StaffPopover({ popover, isAdmin, onSwap, onClose }) {
  if (!popover.visible) return null;
  const { x, y, person, shiftId } = popover;

  return (
    <div
      className="staff-popover"
      style={{ top: y, left: x }}
      onMouseEnter={onClose.cancel}
      onMouseLeave={onClose.now}
    >
      {/* Avatar row */}
      <div className="popover-header">
        <div className={`avatar-badge avatar-badge--lg ${getDeptClass(person.department)}`}>
          {getInitials(person.name)}
        </div>
        <div>
          <div className="popover-name">{person.name}</div>
          <div className="popover-role">{person.role}</div>
        </div>
      </div>

      {/* Detail pills */}
      <div className="popover-pills">
        {person.department && (
          <span className="pill">{person.department}</span>
        )}
        <span className={`pill pill--status ${person.is_locum ? "pill--locum" : "pill--permanent"}`}>
          {person.is_locum ? "⚡ Locum" : "● Permanent"}
        </span>
      </div>

      {/* Admin-only action */}
      {isAdmin && (
        <button
          className="primary-button popover-swap-btn"
          onClick={() => { onSwap(person.employee_id, shiftId); onClose.now(); }}
        >
          🔄 Request Swap
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export function WeeklyRota({ rota, selectedDate, loading, onPrevious, onNext, onToday, onExport, refresh, stats, role }) {
  const [popover, setPopover] = useState({ visible: false, x: 0, y: 0, person: null, shiftId: null });
  const closeTimer = useRef(null);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setPopover(p => ({ ...p, visible: false })), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  function openPopover(e, person, shiftId) {
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    // Position right of the badge, clamped so it doesn't overflow viewport
    const x = Math.min(rect.right + 10, window.innerWidth - 240);
    const y = Math.max(rect.top - 10, 8);
    setPopover({ visible: true, x, y, person, shiftId });
  }

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
      await api.createSwapRequest({ requesting_employee_id: employeeId, shift_id: shiftId });
      alert("Shift swap request posted to the swap board!");
      refresh();
    } catch (err) {
      alert("Could not request swap: " + err.message);
    }
  }

  if (loading || !rota) {
    return <div className="panel loading-panel">Loading rota...</div>;
  }

  const isAdmin = role === "admin";

  return (
    <>
      {/* Floating popover rendered outside the scroll container */}
      <StaffPopover
        popover={popover}
        isAdmin={isAdmin}
        onSwap={requestSwap}
        onClose={{ now: scheduleClose, cancel: cancelClose }}
      />

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
                      <div className="shift-time">{shift.start_time} – {shift.end_time}</div>
                      <div className="shift-location">{shift.location}</div>
                      <div className="shift-grade" style={{ fontSize: "0.75rem", margin: "4px 0", color: "#64748b" }}>
                        Grade: <span className="pill grade-pill" style={{ fontSize: "0.7rem", padding: "1px 4px" }}>{shift.required_grade}</span>
                      </div>

                      <div className="staff-list" style={{ marginTop: "10px", display: "grid", gap: "6px" }}>
                        {isUnassigned && (
                          <div style={{ display: "grid", gap: "5px" }}>
                            <span className="unassigned" style={{ padding: "4px 8px", borderRadius: "6px", display: "inline-block", fontSize: "0.75rem" }}>
                              Unassigned
                            </span>
                            {shift.offered_to_locum_pool && (
                              <div style={{ color: "#4ade80", fontSize: "0.72rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px" }}>
                                🟢 Locum Pool Active
                              </div>
                            )}
                            {isAdmin && (
                              <button
                                className="locum-toggle-btn"
                                onClick={() => toggleLocum(shift.id)}
                                style={{
                                  width: "100%", padding: "4px 8px", fontSize: "0.7rem",
                                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px",
                                  cursor: "pointer", fontWeight: "600",
                                  background: shift.offered_to_locum_pool ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.04)",
                                  color: shift.offered_to_locum_pool ? "#facc15" : "#94a3b8"
                                }}
                              >
                                {shift.offered_to_locum_pool ? "Cancel Locum Offer" : "Offer to Locum"}
                              </button>
                            )}
                          </div>
                        )}

                        {shift.staff.map((person) => (
                          <div key={person.assignment_id} className="staff-avatar-wrapper">
                            {/* Hoverable avatar badge — triggers popover */}
                            <div
                              className={`avatar-badge ${getDeptClass(person.department)}`}
                              onMouseEnter={(e) => openPopover(e, person, shift.id)}
                              onMouseLeave={scheduleClose}
                              style={{ cursor: "pointer" }}
                            >
                              {getInitials(person.name)}
                            </div>

                            <span style={{
                              flexGrow: 1, minWidth: 0,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              fontSize: "0.8rem", fontWeight: "500", color: "#94a3b8"
                            }}>
                              {person.name.replace(/^(dr\.|sister|nurse)\s+/i, "")}
                              <span
                                className={`status-dot ${person.is_locum ? "locum" : "permanent"}`}
                                style={{ marginLeft: "5px", display: "inline-block", verticalAlign: "middle" }}
                              />
                            </span>
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
    </>
  );
}
