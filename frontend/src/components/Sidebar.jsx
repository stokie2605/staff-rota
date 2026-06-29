const items = [
  { id: "rota", label: "Weekly Rota" },
  { id: "employees", label: "Employees" },
  { id: "shifts", label: "Shifts" },
  { id: "assignments", label: "Assign Staff" }
];

export function Sidebar({ activeView, setActiveView, stats }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SR</div>
        <div>
          <h1>StaffRota</h1>
          <p>Shift planning console</p>
        </div>
      </div>
      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? "nav-item active" : "nav-item"}
            onClick={() => setActiveView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}
