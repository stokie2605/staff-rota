const items = [
  { id: "rota", label: "Weekly Rota" },
  { id: "employees", label: "Employees" },
  { id: "shifts", label: "Shifts" },
  { id: "assignments", label: "Assign Staff" },
  { id: "swaps", label: "Shift Swaps" },
  { id: "audit", label: "Audit Logs" }
];

export function Sidebar({ activeView, setActiveView, role, setRole }) {
  // If user role is staff, restrict visibility to the Weekly Rota view only
  const visibleItems = role === "staff" ? items.filter(i => i.id === "rota") : items;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SR</div>
        <div>
          <h1>StaffRota</h1>
          <p>Shift planning console</p>
        </div>
      </div>

      {/* Role Switcher Selector */}
      <div className="role-switcher" style={{ paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <label style={{ display: "block", fontSize: "0.68rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
          Access Console
        </label>
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value)}
          style={{ 
            background: "rgba(15, 23, 42, 0.4)", 
            color: "#f8fafc", 
            borderColor: "rgba(255,255,255,0.08)", 
            fontSize: "0.85rem",
            padding: "6px 8px",
            cursor: "pointer"
          }}
        >
          <option value="admin" style={{ background: "#0f172a" }}>🔒 Rota Manager (Admin)</option>
          <option value="staff" style={{ background: "#0f172a" }}>👁️ Clinical Staff (Read-Only)</option>
        </select>
      </div>
      
      {/* Sidebar nav buttons menu */}
      <nav className="nav-list">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? "nav-item active" : "nav-item"}
            onClick={() => setActiveView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      
      {/* Spacer that pushes settings cleanly to the bottom */}
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
