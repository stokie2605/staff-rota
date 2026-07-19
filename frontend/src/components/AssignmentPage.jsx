import { useState } from "react";
import { api } from "../services/api";
import { useRota } from "../context/RotaContext";
import { useToast } from "../context/ToastContext";

export function AssignmentPage() {
  const { employees, shifts, assignments, refreshAll } = useRota();
  const { addToast } = useToast();
  const [employeeId, setEmployeeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState("");
  
  // Compliance warning override states
  const [warning, setWarning] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [reasonCode, setReasonCode] = useState("EMERGENCY_OVERRIDE");
  const [justification, setJustification] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    
    try {
      const payload = {
        employee_id: Number(employeeId),
        shift_id: Number(shiftId),
        ignore_warnings: showOverride,
        reason_code: showOverride ? reasonCode : "ROSTER_ADJUSTMENT",
        override_justification: showOverride ? justification : undefined
      };

      await api.createAssignment(payload);
      
      // Clear forms
      setEmployeeId("");
      setShiftId("");
      setError("");
      setWarning("");
      setShowOverride(false);
      setJustification("");
      addToast("Staff assigned successfully!");
      refreshAll();
    } catch (err) {
      if (err.type === "COMPLIANCE_WARNING") {
        setWarning(err.message);
        setShowOverride(true);
      } else {
        setError(err.message);
      }
    }
  }

  async function remove(id) {
    const reason = window.prompt(
      "Enter a reason code for deletion (e.g., SICKNESS, ANNUAL_LEAVE, ROSTER_ADJUSTMENT):",
      "ROSTER_ADJUSTMENT"
    );
    if (reason === null) return;
    
    try {
      await api.deleteAssignment(id);
      addToast("Assignment removed");
      refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedEmployee = employees.find(e => e.id === Number(employeeId));
  const selectedShift = shifts.find(s => s.id === Number(shiftId));

  return (
    <section className="panel-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <h3>Assign staff</h3>
        
        <div className="form-group">
          <label>Employee</label>
          <select required value={employeeId} onChange={(event) => {
            setEmployeeId(event.target.value);
            setShowOverride(false);
            setWarning("");
          }}>
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.grade}) - {employee.department} {employee.is_locum ? "[Locum]" : ""}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Shift Slot</label>
          <select required value={shiftId} onChange={(event) => {
            setShiftId(event.target.value);
            setShowOverride(false);
            setWarning("");
          }}>
            <option value="">Select shift</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.date} {shift.start_time}-{shift.end_time} ({shift.required_grade}) at {shift.location}
              </option>
            ))}
          </select>
        </div>

        {/* Warning Override Section */}
        {showOverride && (
          <div className="override-panel" style={{ backgroundColor: "var(--compliance-bg)", borderLeft: "4px solid var(--compliance)", padding: "16px", marginTop: "16px", borderRadius: "8px" }}>
            <h4 style={{ color: "var(--compliance)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.2em" }}>⚠️</span> NHS Compliance Alert
            </h4>
            <p style={{ color: "var(--text)", fontSize: "0.85rem", marginBottom: "16px", lineHeight: "1.4" }}>{warning}</p>
            
            <div className="form-group">
              <label>Reason Code</label>
              <select required value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                <option value="EMERGENCY_OVERRIDE">Emergency Ward Coverage</option>
                <option value="SICKNESS_COVER">Sickness Cover</option>
                <option value="LEAVE_COVER">Leave Cover</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: "0" }}>
              <label>Justification (Minimum 5 characters)</label>
              <input 
                type="text" 
                required 
                placeholder="e.g., Consultant off sick, backup doctor required." 
                value={justification} 
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
        
        <button 
          className={`btn ${showOverride ? "btn-compliance" : "btn-primary"}`} 
          style={{ width: "100%", marginTop: "16px" }}
        >
          {showOverride ? "Force Override & Assign" : "Assign Staff"}
        </button>
      </form>
      
      <div className="panel table-panel">
        <h3>Current assignments</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Grade</th>
              <th>Shift</th>
              <th>Department</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>
                  <strong>{assignment.employee_name}</strong>
                  {assignment.employee_role && <div style={{ fontSize: "0.8rem", color: "#666" }}>{assignment.employee_role}</div>}
                </td>
                <td><span className="pill grade-pill">{assignment.employee_grade}</span></td>
                <td>
                  {assignment.shift.date} {assignment.shift.start_time}-{assignment.shift.end_time}
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>{assignment.shift.location}</div>
                </td>
                <td><span className="pill">{assignment.department}</span></td>
                <td><button className="btn btn-outline" style={{ color: "var(--critical)", borderColor: "var(--critical-bg)" }} onClick={() => remove(assignment.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
