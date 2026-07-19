const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: "⊞",  adminOnly: false },
  { id: "roster",      label: "Roster",      icon: "📅", adminOnly: false },
  { id: "staff",       label: "Staff",       icon: "👤", adminOnly: true  },
  { id: "assignments", label: "Assign Staff",icon: "📋", adminOnly: true  },
  { id: "swaps",       label: "Shift Swaps", icon: "🔄", adminOnly: true  },
  { id: "locations",   label: "Locations",   icon: "📍", adminOnly: false },
  { id: "reports",     label: "Reports",     icon: "📊", adminOnly: true  },
  { id: "audit",       label: "Audit Logs",  icon: "🗂️", adminOnly: true  },
];

export function Sidebar({ activeView, setActiveView, role, setRole }) {
  const isAdmin = role === "admin";
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      {/* Org Header */}
      <div className="sidebar-org">
        <div className="sidebar-org-icon">+</div>
        <div>
          <div className="sidebar-org-name">City General</div>
          <div className="sidebar-org-sub">Clinical Ops</div>
        </div>
      </div>

      {/* Role switcher */}
      <div className="sidebar-role-switcher">
        <span className="sidebar-role-label">Access Console</span>
        <select
          className="sidebar-role-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="admin">🔒 Rota Manager</option>
          <option value="staff">👁️ Clinical Staff</option>
        </select>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* New Shift CTA — admin only */}
      {isAdmin && (
        <button
          className="sidebar-new-shift"
          onClick={() => setActiveView("shifts")}
        >
          + New Shift
        </button>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="nav-item" onClick={() => alert("Settings coming soon")}>
          <span className="nav-icon">⚙️</span>
          <span>Settings</span>
        </button>
        <button className="nav-item" onClick={() => alert("Logged out")}>
          <span className="nav-icon">↩️</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
