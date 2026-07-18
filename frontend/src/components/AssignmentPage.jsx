import { useState } from "react";
import { api } from "../services/api";

export function AssignmentPage({ employees, shifts, assignments, refresh, setNotice }) {
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
      setNotice("Staff assigned successfully");
      refresh();
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
      await api.deleteAssignment(id, reason.trim() || "ROSTER_ADJUSTMENT");
      setNotice("Assignment removed");
      refresh();
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

        {/* Warning Override Section */}
        {showOverride && (
          <div className="override-panel" style={{ backgroundColor: "#fdf8e2", borderLeft: "4px solid #f5c2c2", padding: "15px", marginTop: "15px", borderRadius: "4px" }}>
            <h4 style={{ color: "#856404", marginBottom: "5px" }}>⚠️ NHS Compliance Alert</h4>
            <p style={{ color: "#856404", fontSize: "0.9rem", marginBottom: "12px" }}>{warning}</p>
            
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600" }}>Reason Code</label>
            <select required value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} style={{ width: "100%", padding: "6px", marginBottom: "10px" }}>
              <option value="EMERGENCY_OVERRIDE">Emergency Ward Coverage</option>
              <option value="SICKNESS_COVER">Sickness Cover</option>
              <option value="LEAVE_COVER">Leave Cover</option>
            </select>
            
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600" }}>Justification (Minimum 5 characters)</label>
            <input 
              type="text" 
              required 
              placeholder="e.g., Consultant off sick, backup doctor required." 
              value={justification} 
              onChange={(e) => setJustification(e.target.value)}
              style={{ width: "100%", padding: "6px", marginBottom: "10px" }}
            />
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
        
        <button className={showOverride ? "warning-button" : "primary-button"}>
          {showOverride ? "Force Override & Assign" : "Assign"}
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
                <td><button className="danger-button" onClick={() => remove(assignment.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
