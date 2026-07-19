import { useState } from "react";
import { api } from "../services/api";
import { useRota } from "../context/RotaContext";
import { useToast } from "../context/ToastContext";

function toInputDate(d) { return d.toISOString().slice(0, 10); }
function addDays(dateText, days) {
  const d = new Date(`${dateText}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

// ─── Helpers ───────────────────────────────────────────────────────
const VIEW_START_HOUR = 6;           // Timeline starts at 06:00
const VIEW_HOURS      = 24;          // Show 24 hours
const VIEW_MINUTES    = VIEW_HOURS * 60;
const VIEW_START_MIN  = VIEW_START_HOUR * 60;

function timeToMins(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getShiftStyle(startTime, endTime) {
  let start = timeToMins(startTime);
  let end   = timeToMins(endTime);
  if (end <= start) end += 1440; // Overnight shift

  const clampedStart = Math.max(start, VIEW_START_MIN);
  const clampedEnd   = Math.min(end, VIEW_START_MIN + VIEW_MINUTES);
  if (clampedEnd <= clampedStart) return null;

  const leftPct  = ((clampedStart - VIEW_START_MIN) / VIEW_MINUTES) * 100;
  const widthPct = ((clampedEnd - clampedStart) / VIEW_MINUTES) * 100;
  return { left: `${leftPct}%`, width: `${widthPct}%` };
}

function generateTimeLabels() {
  const labels = [];
  for (let m = VIEW_START_MIN; m <= VIEW_START_MIN + VIEW_MINUTES; m += 120) {
    const h = Math.floor(m / 60) % 24;
    labels.push(`${String(h).padStart(2, "0")}:00`);
  }
  return labels;
}

const TIME_LABELS = generateTimeLabels(); // 13 labels: 06:00 … 06:00+1

// ─── Main Component ────────────────────────────────────────────────
export function GanttRota({ role, searchQuery = "" }) {
  const { rota, shifts, assignments, selectedDate, setSelectedDate, loading, refreshAll } = useRota();
  const { addToast } = useToast();
  const [view, setView] = useState("24h");
  
  const onPrevious = () => setSelectedDate(addDays(selectedDate, -7));
  const onNext = () => setSelectedDate(addDays(selectedDate, 7));
  const onToday = () => setSelectedDate(toInputDate(new Date()));

  async function handlePublish() {
    try {
      await api.publishShifts(rota.week_start, rota.week_end);
      addToast("Roster published successfully!");
      refreshAll();
    } catch (err) {
      addToast(err.message, "danger");
    }
  }

  if (loading || !rota || !rota.days) {
    return (
      <div className="gantt-card">
        <div className="gantt-loading">Loading Live Rota Timeline...</div>
      </div>
    );
  }

  const isAdmin = role === "admin";

  // Extract unique wards from all days or from shifts
  const wards = [...new Set(
    (shifts || []).map(s => s.location)
  )].sort();

  return (
    <div className="gantt-card">
      {/* Header */}
      <div className="gantt-header">
        <h2 className="gantt-title">Live Rota Timeline</h2>
        <div className="gantt-controls">
          <div className="view-toggle">
            {[["24h","24 Hours"],["3days","3 Days"],["week","Week"]].map(([v, label]) => (
              <button
                key={v}
                className={`view-btn ${view === v ? "view-btn--active" : ""}`}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="date-nav">
            <button className="date-nav-btn" onClick={onPrevious}>‹</button>
            <span className="date-nav-label">
              {view === "week"
                ? `${rota.week_start} – ${rota.week_end}`
                : selectedDate}
            </span>
            <button className="date-nav-btn" onClick={onNext}>›</button>
            <button className="btn btn-outline" style={{ marginLeft: "8px", padding: "4px 8px", fontSize: "0.8rem" }} onClick={onToday}>Today</button>
            {isAdmin && <button className="btn btn-primary" style={{ marginLeft: "16px", padding: "4px 12px", fontSize: "0.8rem" }} onClick={handlePublish}>Publish Week</button>}
          </div>
        </div>
      </div>

      {/* Content */}
      {view === "week" ? (
        <WeekView rota={rota} selectedDate={selectedDate} isAdmin={isAdmin} refresh={refreshAll} searchQuery={searchQuery} shifts={shifts} assignments={assignments} />
      ) : view === "3days" ? (
        <ThreeDayView rota={rota} selectedDate={selectedDate} wards={wards} isAdmin={isAdmin} refresh={refreshAll} searchQuery={searchQuery} shifts={shifts} assignments={assignments} />
      ) : (
        <TwentyFourHourView selectedDate={selectedDate} wards={wards} isAdmin={isAdmin} refresh={refreshAll} searchQuery={searchQuery} shifts={shifts} assignments={assignments} />
      )}
    </div>
  );
}

// ─── 24 Hour Gantt View ────────────────────────────────────────────
function TwentyFourHourView({ selectedDate, wards, isAdmin, refresh, searchQuery = "", shifts, assignments }) {
  const [expandedWards, setExpandedWards] = useState({});
  const toggleWard = (ward) => {
    setExpandedWards(prev => ({ ...prev, [ward]: !prev[ward] }));
  };

  // Filter wards by search query (matches ward name or any staff name)
  const q = searchQuery.toLowerCase().trim();
  const dailyShifts = (shifts || []).filter(s => s.date === selectedDate);
  const filteredWards = q
    ? wards.filter(ward => {
        if (ward.toLowerCase().includes(q)) return true;
        const sfts = dailyShifts.filter(s => s.location === ward);
        return sfts.some(shift =>
          (assignments || []).some(a => a.shift_id === shift.id && a.name.toLowerCase().includes(q))
        );
      })
    : wards;
  // Current time indicator
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentPct  = ((currentMins - VIEW_START_MIN) / VIEW_MINUTES) * 100;
  const showNow = currentPct >= 0 && currentPct <= 100;

  const wardShifts = (ward) =>
    dailyShifts.filter(s => s.location === ward);

  return (
    <div className="gantt-scroll-wrapper">
      {/* Time header row */}
      <div className="gantt-time-row">
        <div className="gantt-corner" />
        <div
          className="gantt-time-labels"
          style={{ gridTemplateColumns: `repeat(${TIME_LABELS.length}, 1fr)` }}
        >
          {TIME_LABELS.map(label => (
            <div key={label} className="gantt-time-label">{label}</div>
          ))}
        </div>
      </div>

      {/* Ward rows — wrapped in a relative container for the single now-line */}
      <div style={{ position: "relative" }}>
        {/* Single continuous now-line spanning all rows */}
        {showNow && (
          <div style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `calc(130px + ${currentPct / 100} * (100% - 130px))`,
            width: "2px",
            background: "#3b82f6",
            zIndex: 10,
            pointerEvents: "none"
          }}>
            <div style={{
              position: "absolute",
              top: "-4px",
              left: "-4px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#3b82f6"
            }} />
          </div>
        )}

        {filteredWards.length === 0 ? (
          <div className="gantt-empty" style={{ padding: "32px", textAlign: "center" }}>
            No locations available
          </div>
        ) : (
          filteredWards.map(ward => {
            const wShifts = wardShifts(ward);
            // Auto-collapse if 0 shifts and not explicitly expanded
            const isCollapsed = wShifts.length === 0 && !expandedWards[ward];

            if (isCollapsed) {
              return (
                <div 
                  key={ward} 
                  className="gantt-row accordion-row" 
                  onClick={() => toggleWard(ward)}
                  style={{ cursor: "pointer", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "8px 12px" }}
                >
                  <span style={{ marginRight: "10px", fontSize: "0.8rem", color: "var(--text-muted)" }}>▶</span>
                  <strong style={{ fontSize: "0.9rem" }}>{ward}</strong>
                  <span style={{ marginLeft: "8px", fontSize: "0.8rem", color: "var(--text-faint)" }}>(0 Active Shifts)</span>
                </div>
              );
            }

            return (
              <div key={ward} className="gantt-row">
                <div 
                  className="gantt-ward-cell" 
                  onClick={() => toggleWard(ward)}
                  style={{ cursor: wShifts.length === 0 ? "pointer" : "default" }}
                  title={wShifts.length === 0 ? "Click to collapse" : ""}
                >
                  {wShifts.length === 0 && <span style={{ marginRight: "5px", fontSize: "0.7rem", color: "var(--text-muted)" }}>▼</span>}
                  {ward}
                </div>
                <div className="gantt-track">
                  {/* Grid lines */}
                  {TIME_LABELS.map((_, i) => (
                    <div
                      key={i}
                      className="gantt-gridline"
                      style={{ left: `${(i / (TIME_LABELS.length - 1)) * 100}%` }}
                    />
                  ))}

                  {/* Shift blocks */}
                  {wShifts.map(shift => {
                    const style = getShiftStyle(shift.start_time, shift.end_time);
                    if (!style) return null;
                    const shiftAssignments = (assignments || []).filter(a => a.shift_id === shift.id);
                    const isUnassigned = shiftAssignments.length === 0;
                    const label = isUnassigned
                      ? "Unassigned"
                      : shiftAssignments.map(p => p.name.replace(/^(dr\.|sister|nurse)\s+/i, "")).join(", ");
                    return (
                      <div
                        key={shift.id}
                        className={`gantt-shift ${isUnassigned ? "gantt-shift--unassigned" : "gantt-shift--assigned"} ${!shift.is_published ? "draft-shift" : ""}`}
                        style={style}
                        title={`${shift.start_time}–${shift.end_time} · ${label}`}
                      >
                        <span className="gantt-shift-name">{label}</span>
                        <span className="gantt-shift-time">{shift.start_time}–{shift.end_time}</span>
                      </div>
                    );
                  })}

                  {wShifts.length === 0 && (
                    <div className="gantt-empty" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: "12px", color: "var(--text-muted)" }}>
                      Click location to collapse
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── 3 Day View ────────────────────────────────────────────────────
function ThreeDayView({ rota, selectedDate, wards, isAdmin, refresh, shifts, assignments }) {
  const daysArray = rota?.days || [];
  const idx   = daysArray.findIndex(d => d.date === selectedDate);
  const start = Math.max(0, idx);
  const days  = daysArray.slice(start, start + 3);
  const validDates = days.map(d => d.date);
  const threeDayShifts = (shifts || []).filter(s => validDates.includes(s.date));

  // Current time indicator
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentPct  = ((currentMins - VIEW_START_MIN) / VIEW_MINUTES) * 100;
  const showNow     = currentPct >= 0 && currentPct <= 100;

  // All wards appearing in these 3 days
  const visibleWards = [...new Set(
    threeDayShifts.map(s => s.location)
  )].sort();

  return (
    <div className="gantt-scroll-wrapper">
      {/* 3 col time header */}
      <div className="gantt-time-row">
        <div className="gantt-corner" />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map(day => (
            <div key={day.date} style={{
              borderLeft: "1px solid var(--border)",
              padding: "6px 10px",
              background: day.date === selectedDate ? "var(--primary-light)" : "var(--surface-2)"
            }}>
              <strong style={{ fontSize: "0.8rem", color: day.date === selectedDate ? "var(--primary)" : "var(--text)" }}>
                {day.day}
              </strong>
              <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {day.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(visibleWards.length === 0 ? wards : visibleWards).map(ward => (
        <div key={ward} className="gantt-row">
          <div className="gantt-ward-cell">{ward}</div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map(day => {
              const dShifts = threeDayShifts.filter(s => s.date === day.date && s.location === ward);
              return (
                <div key={day.date} style={{ position: "relative", minHeight: "54px", borderLeft: "1px solid var(--border)" }}>
                  {dShifts.map(shift => {
                    const style = getShiftStyle(shift.start_time, shift.end_time);
                    if (!style) return null;
                    const shiftAssignments = (assignments || []).filter(a => a.shift_id === shift.id);
                    const isUnassigned = shiftAssignments.length === 0;
                    const label = isUnassigned
                      ? "Unassigned"
                      : shiftAssignments.map(p => p.name.replace(/^(dr\.|sister|nurse)\s+/i, "")).join(", ");
                    return (
                      <div
                        key={shift.id}
                        className={`gantt-shift ${isUnassigned ? "gantt-shift--unassigned" : "gantt-shift--assigned"} ${!shift.is_published ? "draft-shift" : ""}`}
                        style={style}
                        title={`${shift.start_time}–${shift.end_time} · ${label}`}
                      >
                        <span className="gantt-shift-name">{label}</span>
                        <span className="gantt-shift-time">{shift.start_time}–{shift.end_time}</span>
                      </div>
                    );
                  })}
                  {/* Now indicator on today's column */}
                  {showNow && day.date === selectedDate && (
                    <div className="gantt-now-line" style={{ left: `${currentPct}%` }}>
                      <div className="gantt-now-dot" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Week View (Card columns) ──────────────────────────────────────
function WeekView({ rota, selectedDate, isAdmin, refresh, shifts, assignments }) {
  async function toggleLocum(shiftId) {
    try { await api.toggleLocumPool(shiftId); refresh(); }
    catch (err) { alert("Could not update locum pool: " + err.message); }
  }

  const daysArray = rota?.days || [];

  return (
    <div className="week-columns">
      {daysArray.map(day => {
        const weekShifts = (shifts || []).filter(s => s.date === day.date);
        return (
        <div
          key={day.date}
          className={`week-col ${day.date === selectedDate ? "week-col--today" : ""}`}
        >
          <div className="week-col-header">
            <strong>{day.day}</strong>
            <span>{day.date.slice(5)}</span>
          </div>
          <div className="week-col-body">
            {weekShifts.length === 0 && (
              <div className="gantt-empty">No shifts</div>
            )}
            {weekShifts.map(shift => {
              const shiftAssignments = (assignments || []).filter(a => a.shift_id === shift.id);
              const isUnassigned = shiftAssignments.length === 0;
              return (
                <div
                  key={shift.id}
                  className={`week-shift-block ${isUnassigned ? "week-shift-block--unassigned" : ""} ${!shift.is_published ? "draft-shift" : ""}`}
                >
                  <div className="wsb-time">{shift.start_time}–{shift.end_time}</div>
                  <div className="wsb-loc">{shift.location}</div>
                  {isUnassigned ? (
                    <>
                      <div className="wsb-unassigned">Unassigned</div>
                      {isAdmin && (
                        <button
                          onClick={() => toggleLocum(shift.id)}
                          style={{
                            marginTop: "5px", fontSize: "0.7rem", padding: "3px 7px",
                            border: "1px solid var(--critical-border)", borderRadius: "5px",
                            background: "var(--critical-bg)", color: "var(--critical)",
                            cursor: "pointer", fontWeight: 600
                          }}
                        >
                          {shift.offered_to_locum_pool ? "✓ Locum Active" : "Offer to Locum"}
                        </button>
                      )}
                    </>
                  ) : (
                    shiftAssignments.map(p => (
                      <div key={p.assignment_id} className="wsb-staff">{p.name}</div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
