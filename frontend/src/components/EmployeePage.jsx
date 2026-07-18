import { useState } from "react";
import { api } from "../services/api";

const emptyEmployee = { name: "", role: "", department: "", grade: "Band 5 Nurse", is_locum: false };

export function EmployeePage({ employees, refresh, setNotice }) {
  const [form, setForm] = useState(emptyEmployee);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createEmployee({
        ...form,
        is_locum: Boolean(form.is_locum)
      });
      setForm(emptyEmployee);
      setNotice("Employee added successfully");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    try {
      await api.deleteEmployee(id);
      setNotice("Employee removed");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <h3>Add employee</h3>
        
        <label>Full Name</label>
        <input 
          required 
          placeholder="e.g. Dr. Jane Smith" 
          value={form.name} 
          onChange={(event) => setForm({ ...form, name: event.target.value })} 
        />
        
        <label>Clinical Role</label>
        <input 
          required 
          placeholder="e.g. Staff Nurse, Ward Consultant" 
          value={form.role} 
          onChange={(event) => setForm({ ...form, role: event.target.value })} 
        />
        
        <label>Department / Ward</label>
        <input
          required
          placeholder="e.g. A&E, Ward 3"
          value={form.department}
          onChange={(event) => setForm({ ...form, department: event.target.value })}
        />

        <label>NHS Grade / Band</label>
        <select 
          required 
          value={form.grade} 
          onChange={(event) => setForm({ ...form, grade: event.target.value })}
        >
          <option value="Band 5 Nurse">Band 5 Nurse (Staff Nurse)</option>
          <option value="Band 6 Nurse">Band 6 Nurse (Senior / Sister)</option>
          <option value="Junior Doctor">Junior Doctor</option>
          <option value="Registrar">Registrar</option>
          <option value="Consultant">Consultant</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px", cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={form.is_locum} 
            onChange={(event) => setForm({ ...form, is_locum: event.target.checked })}
            style={{ width: "auto" }}
          />
          <span>Register as Locum / Agency Staff</span>
        </label>

        {error && <p className="error-message">{error}</p>}
        <button className="primary-button">Add Employee</button>
      </form>
      
      <div className="panel table-panel">
        <h3>Employee directory</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Grade</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td><strong>{employee.name}</strong></td>
                <td><span className="pill grade-pill">{employee.grade}</span></td>
                <td>{employee.role}</td>
                <td><span className="pill">{employee.department}</span></td>
                <td>
                  {employee.is_locum ? (
                    <span className="locum-tag">LOCUM</span>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "#28a745", fontWeight: "600" }}>Permanent</span>
                  )}
                </td>
                <td><button className="danger-button" onClick={() => remove(employee.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
