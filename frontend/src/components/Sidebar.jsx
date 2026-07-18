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
      
      {/* Sidebar nav buttons menu - natural height spacing */}
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
      
      {/* Spacer that pushes settings cleanly to the bottom without stretching the grid */}
      <div style={{ flexGrow: 1 }} />
      
      <div className="settings-footer" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "15px" }}>
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
