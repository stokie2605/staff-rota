import { useState } from "react";
import { api } from "../services/api";

const emptyEmployee = { name: "", role: "", department: "" };

export function EmployeePage({ employees, refresh, setNotice }) {
  const [form, setForm] = useState(emptyEmployee);

  async function submit(event) {
    event.preventDefault();
    await api.createEmployee(form);
    setForm(emptyEmployee);
    setNotice("Employee added");
    refresh();
  }

  async function remove(id) {
    await api.deleteEmployee(id);
    setNotice("Employee removed");
    refresh();
  }

  return (
    <section className="panel-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <h3>Add employee</h3>
        <input required placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input required placeholder="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
        <input
          required
          placeholder="Department"
          value={form.department}
          onChange={(event) => setForm({ ...form, department: event.target.value })}
        />
        <button className="primary-button">Add Employee</button>
      </form>
      <div className="panel table-panel">
        <h3>Employee directory</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{employee.role}</td>
                <td><span className="pill">{employee.department}</span></td>
                <td><button className="danger-button" onClick={() => remove(employee.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
