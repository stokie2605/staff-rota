function departmentClass(department) {
  const value = department.toLowerCase().replaceAll(" ", "-");
  return `dept-${value}`;
}

export function WeeklyRota({ rota, selectedDate, loading, onPrevious, onNext, onToday, onExport }) {
  if (loading || !rota) {
    return <div className="panel loading-panel">Loading rota...</div>;
  }

  return (
    <section className="rota-section">
      <div className="week-toolbar">
        <div>
          <p className="eyebrow">Week commencing</p>
          <h3>{rota.week_start} to {rota.week_end}</h3>
        </div>
        <div className="toolbar-actions">
          <button onClick={onPrevious}>Previous</button>
          <button onClick={onToday}>Today</button>
          <button onClick={onNext}>Next</button>
          <button className="primary-button" onClick={onExport}>Export CSV</button>
        </div>
      </div>
      <div className="rota-grid">
        {rota.days.map((day) => (
          <article className="day-column" key={day.date}>
            <div className={day.date === selectedDate ? "day-header selected" : "day-header"}>
              <strong>{day.day}</strong>
              <span>{day.date}</span>
            </div>
            <div className="shift-stack">
              {day.shifts.length === 0 && <p className="empty-state">No shifts</p>}
              {day.shifts.map((shift) => (
                <div className="shift-card" key={shift.id}>
                  <div className="shift-time">{shift.start_time} - {shift.end_time}</div>
                  <div className="shift-location">{shift.location}</div>
                  <div className="staff-list">
                    {shift.staff.length === 0 && <span className="unassigned">Unassigned</span>}
                    {shift.staff.map((person) => (
                      <span className={`staff-chip ${departmentClass(person.department)}`} key={person.assignment_id}>
                        {person.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
