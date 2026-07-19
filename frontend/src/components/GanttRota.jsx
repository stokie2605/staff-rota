import { useState } from "react";
import { api } from "../services/api";

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
export function GanttRota({ rota, selectedDate, loading, onPrevious, onNext, onToday, refresh, role, searchQuery = "" }) {
  const [view, setView] = useState("24h");

  if (loading || !rota) {
    return (
      <div className="gantt-card">
        <div className="gantt-loading">Loading Live Rota Timeline...</div>
      </div>
    );
  }

  const isAdmin = role === "admin";

  // Extract unique wards from all days
  const wards = [...new Set(
    rota.days.flatMap(d => d.shifts.map(s => s.location))
  )].sort();

  // The day data for the selected date (24h view) or today
  const activeDay = rota.days.find(d => d.date === selectedDate) || rota.days[0];

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
          </div>
        </div>
      </div>

      {/* Content */}
      {view === "week" ? (
        <WeekView rota={rota} selectedDate={selectedDate} isAdmin={isAdmin} refresh={refresh} searchQuery={searchQuery} />
      ) : view === "3days" ? (
        <ThreeDayView rota={rota} selectedDate={selectedDate} wards={wards} isAdmin={isAdmin} refresh={refresh} searchQuery={searchQuery} />
      ) : (
        <TwentyFourHourView activeDay={activeDay} wards={wards} isAdmin={isAdmin} refresh={refresh} searchQuery={searchQuery} />
      )}
    </div>
  );
}

// ─── 24 Hour Gantt View ────────────────────────────────────────────
function TwentyFourHourView({ activeDay, wards, isAdmin, refresh, searchQuery = "" }) {
  // Filter wards by search query (matches ward name or any staff name)
  const q = searchQuery.toLowerCase().trim();
  const filteredWards = q
    ? wards.filter(ward => {
        if (ward.toLowerCase().includes(q)) return true;
        const shifts = activeDay ? activeDay.shifts.filter(s => s.location === ward) : [];
        return shifts.some(shift =>
          shift.staff.some(p => p.name.toLowerCase().includes(q))
        );
      })
    : wards;
  // Current time indicator
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentPct  = ((currentMins - VIEW_START_MIN) / VIEW_MINUTES) * 100;
  const showNow = currentPct >= 0 && currentPct <= 100;

  const wardShifts = (ward) =>
    activeDay ? activeDay.shifts.filter(s => s.location === ward) : [];

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

        {filteredWards.length === 0 && q ? (
          <div className="gantt-empty" style={{ padding: "32px", textAlign: "center" }}>
            No wards or staff matching "{searchQuery}"
          </div>
        ) : (
          filteredWards.map(ward => (
          <div key={ward} className="gantt-row">
            <div className="gantt-ward-cell">{ward}</div>
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
              {wardShifts(ward).map(shift => {
                const style = getShiftStyle(shift.start_time, shift.end_time);
                if (!style) return null;
                const isUnassigned = shift.staff.length === 0;
                const label = isUnassigned
                  ? "Unassigned"
                  : shift.staff.map(p => p.name.replace(/^(dr\.|sister|nurse)\s+/i, "")).join(", ");
                return (
                  <div
                    key={shift.id}
                    className={`gantt-shift ${isUnassigned ? "gantt-shift--unassigned" : "gantt-shift--assigned"}`}
                    style={style}
                    title={`${shift.start_time}–${shift.end_time} · ${label}`}
                  >
                    <span className="gantt-shift-name">{label}</span>
                    <span className="gantt-shift-time">{shift.start_time}–{shift.end_time}</span>
                  </div>
                );
              })}

              {wardShifts(ward).length === 0 && (
                <div className="gantt-empty" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: "12px" }}>
                  No shifts
                </div>
              )}
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}

// ─── 3 Day View ────────────────────────────────────────────────────
function ThreeDayView({ rota, selectedDate, wards, isAdmin, refresh }) {
  const idx   = rota.days.findIndex(d => d.date === selectedDate);
  const start = Math.max(0, idx);
  const days  = rota.days.slice(start, start + 3);

  // Current time indicator
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentPct  = ((currentMins - VIEW_START_MIN) / VIEW_MINUTES) * 100;
  const showNow     = currentPct >= 0 && currentPct <= 100;

  // All wards appearing in these 3 days
  const visibleWards = [...new Set(
    days.flatMap(d => d.shifts.map(s => s.location))
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
              const shifts = day.shifts.filter(s => s.location === ward);
              return (
                <div key={day.date} style={{ position: "relative", minHeight: "54px", borderLeft: "1px solid var(--border)" }}>
                  {shifts.map(shift => {
                    const style = getShiftStyle(shift.start_time, shift.end_time);
                    if (!style) return null;
                    const isUnassigned = shift.staff.length === 0;
                    const label = isUnassigned
                      ? "Unassigned"
                      : shift.staff.map(p => p.name.replace(/^(dr\.|sister|nurse)\s+/i, "")).join(", ");
                    return (
                      <div
                        key={shift.id}
                        className={`gantt-shift ${isUnassigned ? "gantt-shift--unassigned" : "gantt-shift--assigned"}`}
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
function WeekView({ rota, selectedDate, isAdmin, refresh }) {
  async function toggleLocum(shiftId) {
    try { await api.toggleLocumPool(shiftId); refresh(); }
    catch (err) { alert("Could not update locum pool: " + err.message); }
  }

  return (
    <div className="week-columns">
      {rota.days.map(day => (
        <div
          key={day.date}
          className={`week-col ${day.date === selectedDate ? "week-col--today" : ""}`}
        >
          <div className="week-col-header">
            <strong>{day.day}</strong>
            <span>{day.date.slice(5)}</span>
          </div>
          <div className="week-col-body">
            {day.shifts.length === 0 && (
              <div className="gantt-empty">No shifts</div>
            )}
            {day.shifts.map(shift => {
              const isUnassigned = shift.staff.length === 0;
              return (
                <div
                  key={shift.id}
                  className={`week-shift-block ${isUnassigned ? "week-shift-block--unassigned" : ""}`}
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
                    shift.staff.map(p => (
                      <div key={p.assignment_id} className="wsb-staff">{p.name}</div>
                    ))
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
