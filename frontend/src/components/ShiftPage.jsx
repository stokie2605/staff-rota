import { useState } from "react";
import { api } from "../services/api";

const emptyShift = { date: "", start_time: "", end_time: "", location: "", required_grade: "Band 5 Nurse" };

export function ShiftPage({ shifts, refresh, setNotice }) {
  const [form, setForm] = useState(emptyShift);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await api.createShift(form);
      setForm(emptyShift);
      setNotice("Shift added successfully");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    try {
      await api.deleteShift(id);
      setNotice("Shift removed");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <h3>Add shift</h3>
        
        <div className="form-group">
          <label>Date</label>
          <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div className="form-group">
            <label>Start Time</label>
            <input required type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
          </div>
          
          <div className="form-group">
            <label>End Time</label>
            <input required type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
          </div>
        </div>
        
        <div className="form-group">
          <label>Location / Ward</label>
          <input required placeholder="e.g. Ward A, ICU" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </div>
        
        <div className="form-group">
          <label>Required Staff Grade</label>
          <select 
            required 
            value={form.required_grade} 
            onChange={(event) => setForm({ ...form, required_grade: event.target.value })}
          >
            <option value="Band 5 Nurse">Band 5 Nurse (Staff Nurse)</option>
            <option value="Band 6 Nurse">Band 6 Nurse (Senior / Sister)</option>
            <option value="Junior Doctor">Junior Doctor</option>
            <option value="Registrar">Registrar</option>
            <option value="Consultant">Consultant</option>
          </select>
        </div>

        {error && <p className="error-message">{error}</p>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Add Shift</button>
      </form>
      
      <div className="panel table-panel">
        <h3>Shift list</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Required Grade</th>
              <th>Hours</th>
              <th>Location</th>
              <th>Locum Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td><strong>{shift.date}</strong></td>
                <td><span className="pill grade-pill">{shift.required_grade}</span></td>
                <td>{shift.start_time} - {shift.end_time}</td>
                <td>{shift.location}</td>
                <td>
                  {shift.offered_to_locum_pool ? (
                    <span className="locum-tag">🔊 Paged Locums</span>
                  ) : (
                    <span style={{ fontSize: "0.80rem", color: "#666" }}>Closed Pool</span>
                  )}
                </td>
                <td><button className="btn btn-outline" style={{ color: "var(--critical)", borderColor: "var(--critical-bg)" }} onClick={() => remove(shift.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
