const items = [
  { id: "rota", label: "Weekly Rota" },
  { id: "employees", label: "Employees" },
  { id: "shifts", label: "Shifts" },
  { id: "assignments", label: "Assign Staff" },
  { id: "swaps", label: "Shift Swaps" },
  { id: "audit", label: "Audit Logs" }
];

export function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SR</div>
        <div>
          <h1>StaffRota</h1>
          <p>Shift planning console</p>
        </div>
      </div>
      <nav className="nav-list" style={{ flexGrow: 1 }}>
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
      <div className="settings-footer" style={{ borderTop: "1px solid #1e293b", paddingTop: "15px" }}>
        <button 
          className="nav-item" 
          style={{ width: "100%", opacity: 0.7 }}
          onClick={() => alert("Settings panel configuration coming soon!")}
        >
          ⚙️ Settings
        </button>
      </div>
    </aside>
  );
}
