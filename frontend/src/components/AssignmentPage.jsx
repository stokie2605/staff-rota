import { useState } from "react";
import { api } from "../services/api";

export function AssignmentPage({ employees, shifts, assignments, refresh, setNotice }) {
  const [employeeId, setEmployeeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createAssignment({ employee_id: Number(employeeId), shift_id: Number(shiftId) });
      setEmployeeId("");
      setShiftId("");
      setNotice("Staff assigned");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    await api.deleteAssignment(id);
    setNotice("Assignment removed");
    refresh();
  }

  return (
    <section className="panel-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <h3>Assign staff</h3>
        <select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          <option value="">Select employee</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.name} - {employee.department}</option>
          ))}
        </select>
        <select required value={shiftId} onChange={(event) => setShiftId(event.target.value)}>
          <option value="">Select shift</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>{shift.date} {shift.start_time}-{shift.end_time} at {shift.location}</option>
          ))}
        </select>
        {error && <p className="error-message">{error}</p>}
        <button className="primary-button">Assign</button>
      </form>
      <div className="panel table-panel">
        <h3>Current assignments</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Shift</th>
              <th>Department</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>{assignment.employee_name}</td>
                <td>{assignment.shift.date} {assignment.shift.start_time}-{assignment.shift.end_time}</td>
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
