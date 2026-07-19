import { useRota } from "../context/RotaContext";

export function Sidebar({ activeView, setActiveView, role }) {
  const { getLabel, logout, industryTemplate, setIndustryTemplate } = useRota();
  const isAdmin = role === "admin";

  const NAV_ITEMS = [
    { id: "dashboard",   label: "Dashboard",   icon: "⊞",  adminOnly: false },
    { id: "roster",      label: "Roster",      icon: "📅", adminOnly: false },
    { id: "staff",       label: getLabel("staff"), icon: "👤", adminOnly: true  },
    { id: "assignments", label: `Assign ${getLabel("staff")}`,icon: "📋", adminOnly: true  },
    { id: "swaps",       label: "Shift Swaps", icon: "🔄", adminOnly: true  },
    { id: "locations",   label: getLabel("location") + "s", icon: "📍", adminOnly: false },
    { id: "absences",    label: "Absences",    icon: "🌴", adminOnly: true  },
    { id: "reports",     label: "Reports",     icon: "📊", adminOnly: true  },
    { id: "audit",       label: "Audit Logs",  icon: "🗂️", adminOnly: true  },
  ];

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      {/* Org Header */}
      <div className="sidebar-org" style={{ marginBottom: "20px" }}>
        <div className="sidebar-org-icon">✦</div>
        <div>
          <div className="sidebar-org-name">RotaCare</div>
          <div className="sidebar-org-sub">SaaS Portal</div>
        </div>
      </div>

      {isAdmin && (
        <div className="sidebar-role-switcher" style={{ marginBottom: "20px" }}>
          <span className="sidebar-role-label">Industry Template</span>
          <select
            className="sidebar-role-select"
            value={industryTemplate}
            onChange={(e) => setIndustryTemplate(e.target.value)}
          >
            <option value="dental">🦷 Dental Clinic</option>
            <option value="physio">🏃 Physio & Rehab</option>
            <option value="care_home">🏡 Care Home</option>
            <option value="general">🏥 General Medical</option>
          </select>
        </div>
      )}

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
        <button className="nav-item" onClick={logout}>
          <span className="nav-icon">↩️</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
