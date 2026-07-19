// ─── Alert Builder (shared with TopNav + NeedsAttention) ──────────────────────
function timeToMs(dateStr, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return new Date(`${dateStr}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`).getTime();
}

export function buildAlerts(rota, swapRequests, employees, selectedDate) {
  const alerts = [];
  if (!rota) return alerts;

  // 1. Unstaffed shifts on selected date
  const todayData = rota.days.find(d => d.date === selectedDate);
  if (todayData) {
    todayData.shifts.forEach(shift => {
      if (shift.staff.length === 0) {
        alerts.push({
          type: "critical",
          category: shift.location,
          message: `${shift.start_time}–${shift.end_time} shift is Unstaffed`,
          navigateTo: "assignments"
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
      let endMs = timeToMs(curr.date, curr.end);
      const [eh] = curr.end.split(":").map(Number);
      const [sh] = curr.start.split(":").map(Number);
      if (eh <= sh) endMs += 24 * 60 * 60 * 1000;
      const nextStartMs = timeToMs(next.date, next.start);
      const restHours = (nextStartMs - endMs) / (1000 * 60 * 60);
      if (restHours > 0 && restHours < 11) {
        alerts.push({
          type: "compliance",
          category: name,
          message: `${Math.round(restHours)} hours rest violation detected between shifts.`,
          navigateTo: "audit"
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
        message: `Shift swap request pending for Shift #${req.shift_id}`,
        navigateTo: "swaps"
      });
    });
  }

  return alerts;
}
