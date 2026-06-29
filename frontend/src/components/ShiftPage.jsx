import { useState } from "react";
import { api } from "../services/api";

const emptyShift = { date: "", start_time: "", end_time: "", location: "" };

export function ShiftPage({ shifts, refresh, setNotice }) {
  const [form, setForm] = useState(emptyShift);

  async function submit(event) {
    event.preventDefault();
    await api.createShift(form);
    setForm(emptyShift);
    setNotice("Shift added");
    refresh();
  }

  async function remove(id) {
    await api.deleteShift(id);
    setNotice("Shift removed");
    refresh();
  }

  return (
    <section className="panel-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <h3>Add shift</h3>
        <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <input required type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
        <input required type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
        <input required placeholder="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        <button className="primary-button">Add Shift</button>
      </form>
      <div className="panel table-panel">
        <h3>Shift list</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td>{shift.date}</td>
                <td>{shift.start_time}</td>
                <td>{shift.end_time}</td>
                <td>{shift.location}</td>
                <td><button className="danger-button" onClick={() => remove(shift.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
