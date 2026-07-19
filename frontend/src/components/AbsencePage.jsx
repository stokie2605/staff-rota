import React, { useState } from "react";
import { api } from "../services/api";
import { useRota } from "../context/RotaContext";
import { useToast } from "../context/ToastContext";

export function AbsencePage() {
  const { absences, employees, refreshAll } = useRota();
  const { addToast } = useToast();
  
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("Sickness");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    
    try {
      // Iterate from startDate to endDate and create records
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        throw new Error("End date must be after start date.");
      }

      // Loop through each day and create an absence record
      let current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        await api.createAbsence({
          employee_id: Number(employeeId),
          date: dateStr,
          reason
        });
        current.setDate(current.getDate() + 1);
      }

      setEmployeeId("");
      setStartDate("");
      setEndDate("");
      setReason("Sickness");
      addToast("Absence recorded successfully.", "success");
      refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove(id) {
    try {
      await api.deleteAbsence(id);
      addToast("Absence removed.", "success");
      refreshAll();
    } catch (err) {
      addToast(err.message, "danger");
    }
  }

  return (
    <section className="panel-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <h3>Record Staff Absence</h3>
        
        <div className="form-group">
          <label>Employee</label>
          <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee...</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.grade})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Start Date</label>
          <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label>End Date</label>
          <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Absence Type</label>
          <select required value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="Sickness">Sickness</option>
            <option value="Annual Leave">Annual Leave</option>
            <option value="Training">Training</option>
            <option value="Maternity / Paternity">Maternity / Paternity</option>
          </select>
        </div>

        {error && <p className="error-message" style={{ color: "var(--critical)" }}>{error}</p>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }} disabled={isSubmitting}>
          {isSubmitting ? "Recording..." : "Record Absence"}
        </button>
      </form>

      <div className="panel table-panel">
        <h3>Recorded Absences</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {absences.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>No absences recorded.</td></tr>
            ) : (
              absences.map(abs => (
                <tr key={abs.id}>
                  <td><strong>{abs.employee_name}</strong></td>
                  <td>{abs.date}</td>
                  <td>{abs.reason}</td>
                  <td>
                    <button className="btn btn-outline" style={{ color: "var(--critical)", borderColor: "var(--critical-bg)" }} onClick={() => remove(abs.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
