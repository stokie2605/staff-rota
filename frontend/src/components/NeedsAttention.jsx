export function NeedsAttention({ rota, swapRequests, employees, selectedDate, onNavigate, refresh }) {
  const alerts = buildAlerts(rota, swapRequests, employees, selectedDate);

  if (alerts.length === 0) {
    return (
      <div className="needs-attention">
        <div className="needs-attention-title">✅ All Clear Today</div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No compliance violations, unstaffed shifts, or pending requests.
        </div>
      </div>
    );
  }

  return (
    <div className="needs-attention">
      <div className="needs-attention-title">
        ❗ Needs Attention Today
      </div>
      {alerts.map((alert, i) => (
        <AlertCard key={i} alert={alert} onNavigate={onNavigate} refresh={refresh} />
      ))}
    </div>
  );
}

function AlertCard({ alert, onNavigate, refresh }) {
  return (
    <div className="alert-card">
      <div className={`alert-accent ${alert.type}`} />
      <div className="alert-body">
        <div>
          <span className={`alert-badge ${alert.type}`}>
            {alert.type.toUpperCase()}
          </span>
          <span className="alert-category">{alert.category}</span>
        </div>
        <div className="alert-message">{alert.message}</div>
      </div>
      <div className="alert-actions">
        {alert.type === "critical" && (
          <button className="btn btn-critical" onClick={() => onNavigate("assignments")}>
            Fix Now
          </button>
        )}
        {alert.type === "compliance" && (
          <>
            <button className="btn btn-outline" onClick={() => onNavigate("assignments")}>
              Change Staff
            </button>
            <button className="btn btn-compliance" onClick={() => onNavigate("audit")}>
              Approve Override
            </button>
          </>
        )}
        {alert.type === "request" && (
          <button className="btn btn-request" onClick={() => onNavigate("swaps")}>
            Approve Swap
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Alert computation ─────────────────────────────────────────────
function timeToMs(dateStr, timeStr) {
  let [h, m] = timeStr.split(":").map(Number);
  return new Date(`${dateStr}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`).getTime();
}

function buildAlerts(rota, swapRequests, employees, selectedDate) {
  const alerts = [];
  if (!rota) return alerts;

  // 1. Unstaffed shifts on the selected date
  const todayData = rota.days.find(d => d.date === selectedDate);
  if (todayData) {
    todayData.shifts.forEach(shift => {
      if (shift.staff.length === 0) {
        alerts.push({
          type: "critical",
          category: shift.location,
          message: `${shift.start_time}–${shift.end_time} shift is Unstaffed`
        });
      }
    });
  }

  // 2. EWTD 11-hour rest violations across the week
  const empShifts = {};
  rota.days.forEach(day => {
    day.shifts.forEach(shift => {
      shift.staff.forEach(person => {
        if (!empShifts[person.employee_id]) {
          empShifts[person.employee_id] = { name: person.name, shifts: [] };
        }
        empShifts[person.employee_id].shifts.push({
          date: day.date,
          start: shift.start_time,
          end: shift.end_time
        });
      });
    });
  });

  Object.values(empShifts).forEach(({ name, shifts }) => {
    shifts.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    for (let i = 0; i < shifts.length - 1; i++) {
      const curr = shifts[i];
      const next = shifts[i + 1];
      // Get end of current shift
      let endMs = timeToMs(curr.date, curr.end);
      // If end time <= start time, it's an overnight shift — add a day
      const [eh] = curr.end.split(":").map(Number);
      const [sh] = curr.start.split(":").map(Number);
      if (eh <= sh) endMs += 24 * 60 * 60 * 1000;
      const nextStartMs = timeToMs(next.date, next.start);
      const restHours = (nextStartMs - endMs) / (1000 * 60 * 60);
      if (restHours > 0 && restHours < 11) {
        alerts.push({
          type: "compliance",
          category: name,
          message: `${Math.round(restHours)} hours rest violation detected between shifts.`
        });
      }
    }
  });

  // 3. Pending swap requests
  if (swapRequests && swapRequests.length > 0) {
    swapRequests.forEach(req => {
      const emp = employees.find(e => e.id === req.requesting_employee_id);
      const empName = emp ? emp.name : `Employee #${req.requesting_employee_id}`;
      alerts.push({
        type: "request",
        category: empName,
        message: `Shift swap request pending for Shift #${req.shift_id}`
      });
    });
  }

  return alerts;
}
