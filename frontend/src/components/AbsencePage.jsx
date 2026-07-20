import React, { useState } from "react";
import { useRota } from "../context/RotaContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function AbsencePage() {
  const { absences, setAbsences, employees, assignments, shifts } = useRota();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Top Metrics calculation
  const today = new Date().toISOString().slice(0, 10);
  const staffOnLeaveToday = absences.filter(a => a.start_date <= today && a.end_date >= today && a.status === "Approved").length;
  const pendingRequests = absences.filter(a => a.status === "Pending").length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let totalLeaveDaysThisMonth = 0;
  
  absences.forEach(a => {
    if (a.status === "Approved") {
      const s = new Date(a.start_date);
      const e = new Date(a.end_date);
      if (s.getMonth() === currentMonth && s.getFullYear() === currentYear) {
        // approx days
        const diffTime = Math.abs(e - s);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        totalLeaveDaysThisMonth += diffDays;
      }
    }
  });

  const removeAbsence = (id) => {
    setAbsences(absences.filter(a => a.id !== id));
  };
  
  // Calculate Conflict Count
  const getConflictCount = (employeeName, startDate, endDate) => {
    // find assigned shifts for this employee in the date range
    const empAssigns = assignments.filter(a => a.name === employeeName);
    let conflicts = 0;
    empAssigns.forEach(a => {
      const shift = shifts.find(s => s.id === a.shift_id);
      if (shift && shift.date >= startDate && shift.date <= endDate) {
        conflicts++;
      }
    });
    return conflicts;
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text)" }}>Leave Management</h2>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)" }}>Manage staff absences and view scheduling conflicts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Log Absence</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>Staff on Leave Today</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text)", marginTop: "8px" }}>{staffOnLeaveToday}</div>
        </div>
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>Pending Requests</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: pendingRequests > 0 ? "var(--warning)" : "var(--text)", marginTop: "8px" }}>{pendingRequests}</div>
        </div>
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>Leave Days (This Month)</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text)", marginTop: "8px" }}>{totalLeaveDaysThisMonth}</div>
        </div>
      </div>

      <div className="panel" style={{ flex: 1, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ overflowY: "auto", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Staff Member</th>
                <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Leave Type</th>
                <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Date Range</th>
                <th style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Conflicts</th>
                <th style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {absences.map(abs => {
                const conflicts = getConflictCount(abs.employee_name, abs.start_date, abs.end_date);
                
                return (
                  <tr key={abs.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", fontWeight: "bold", color: "var(--text)" }}>{abs.employee_name}</td>
                    <td style={{ padding: "16px", color: "var(--text)" }}>{abs.reason}</td>
                    <td style={{ padding: "16px", color: "var(--text)" }}>{abs.start_date} to {abs.end_date}</td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      {abs.status === "Pending" ? (
                        <span style={{ background: "var(--warning)", color: "#fff", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>PENDING</span>
                      ) : (
                        <span style={{ background: "var(--success-bg, #e6f4ea)", color: "var(--success, #1e8e3e)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>APPROVED</span>
                      )}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", color: conflicts > 0 ? "var(--critical)" : "var(--text)", fontWeight: "bold" }}>
                      {conflicts > 0 ? `⚠️ ${conflicts} Shifts` : "0"}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.8rem", color: "var(--critical)", borderColor: "var(--critical-bg)" }} onClick={() => removeAbsence(abs.id)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
              {absences.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>No absences recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <LogAbsenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function LogAbsenceModal({ isOpen, onClose }) {
  const { absences, setAbsences, employees } = useRota();
  const { addToast } = useToast();
  
  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState("Annual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emp = employees.find(e => String(e.id) === String(employeeId));
    if (!emp) return;

    const payload = {
      employee_id: emp.id,
      date: startDate, // Send start date for API for now, we'd loop if multiple days
      reason
    };
    
    try {
      // Basic implementation for saving an absence
      // The old API looped through days to create a record per day. 
      // For now we'll do the same to match the old api.js
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      let current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        await api.createAbsence({
          employee_id: Number(emp.id),
          date: dateStr,
          reason
        });
        current.setDate(current.getDate() + 1);
      }
      
      const newAbsence = {
        id: Date.now(),
        employee_id: emp.id,
        employee_name: emp.name,
        reason,
        start_date: startDate,
        end_date: endDate,
        status: "Approved",
        notes
      };
      setAbsences([...absences, newAbsence]);
      
    } catch (err) {
      // Offline fallback
      const newAbsence = {
        id: Date.now(),
        employee_id: emp.id,
        employee_name: emp.name,
        reason,
        start_date: startDate,
        end_date: endDate,
        status: "Approved",
        notes
      };
      setAbsences([...absences, newAbsence]);
      addToast("Offline Mode: Absence saved locally", "warning");
    }
    
    // reset
    setEmployeeId("");
    setReason("Annual Leave");
    setStartDate("");
    setEndDate("");
    setNotes("");
    onClose();
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: "450px", maxWidth: "90%", background: "var(--surface)", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", padding: "24px", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ margin: 0, color: "var(--text)" }}>Log Absence</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Staff Member
            <select required value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
              <option value="">-- Select Staff --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Leave Type
            <select required value={reason} onChange={e => setReason(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sickness">Sickness</option>
              <option value="Training">Training</option>
              <option value="Maternity / Paternity">Maternity / Paternity</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: "12px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem", flex: 1 }}>
              Start Date
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem", flex: 1 }}>
              End Date
              <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Notes (Optional)
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", minHeight: "80px" }} placeholder="Additional context..." />
          </label>

          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, padding: "12px" }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: "12px" }}>Log Absence</button>
          </div>
        </form>
      </div>
    </div>
  );
}
