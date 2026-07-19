import { useState, useRef, useEffect } from "react";

// ─── Help Modal ────────────────────────────────────────────────────
const HELP_RULES = [
  {
    icon: "⏱️",
    title: "11-Hour Rest Rule",
    body: "Staff must have a minimum of 11 consecutive hours of rest between shifts. The system automatically detects and flags violations in the Needs Attention panel."
  },
  {
    icon: "📊",
    title: "48-Hour Weekly Cap",
    body: "Total scheduled hours cannot exceed 48 hours in a rolling 7-day window (European Working Time Directive). Assignments breaching this cap require an override justification."
  },
  {
    icon: "🗂️",
    title: "Audit Logging",
    body: (
      <>
        Any compliance bypass requires a mandatory reason code (e.g. <code style={{ background:"#f1f5f9", padding:"1px 4px", borderRadius:3 }}>SICKNESS_COVER</code>, <code style={{ background:"#f1f5f9", padding:"1px 4px", borderRadius:3 }}>EMERGENCY_OVERRIDE</code>) and textual justification, permanently logged to the database.
      </>
    )
  },
  {
    icon: "🔄",
    title: "Shift Swap Workflow",
    body: "Staff post swap requests directly from the rota view. Rota Managers review and approve or reject them on the Shift Swaps board. All approved swaps run through the full compliance engine before saving."
  },
  {
    icon: "⚡",
    title: "Locum Pool Broadcasting",
    body: "Unassigned shifts can be broadcast to the locum pool with one click. Agency and locum staff are tagged with amber ⚡ indicators across all views and directory listings."
  },
  {
    icon: "🔒",
    title: "Role-Based Access",
    body: "Clinical Staff (Read-Only) can view the rota but cannot edit, assign, or approve swaps. Rota Manager (Admin) has full write access to all scheduling functions."
  }
];

function HelpModal({ onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="NHS Compliance Support Guide">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">NHS Compliance Support Guide</h2>
            <p className="modal-subtitle">European Working Time Directive rules enforced by this system</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {HELP_RULES.map((rule) => (
            <div key={rule.title} className="help-rule">
              <div className="help-rule-icon">{rule.icon}</div>
              <div>
                <h3 className="help-rule-title">{rule.title}</h3>
                <p className="help-rule-body">{rule.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <a
            href="https://www.nhsemployers.org/articles/working-time-regulations"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "0.8rem", color: "var(--primary)" }}
          >
            NHS Employers — Working Time Regulations ↗
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Live Clock ────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="topnav-clock">
      <span className="topnav-clock-time">
        {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <span className="topnav-clock-date">
        {time.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
      </span>
    </div>
  );
}

// ─── Main TopNav ───────────────────────────────────────────────────
export function TopNav({ alerts = [], onNavigate, searchQuery, setSearchQuery, role, backendOk }) {
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [helpOpen,    setHelpOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("topnav-search-input")?.focus();
      }
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const unreadCount = alerts.length;

  return (
    <nav className="topnav">
      {/* Brand */}
      <span className="topnav-brand">RotaCare</span>

      {/* Backend status dot */}
      <div
        className={`backend-status-dot ${backendOk ? "backend-status-dot--ok" : "backend-status-dot--down"}`}
        title={backendOk ? "Backend connected" : "Backend offline or sleeping"}
      />

      {/* Live clock */}
      <LiveClock />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search */}
      <div className="topnav-search-wrapper">
        <span className="topnav-search-icon">🔍</span>
        <input
          id="topnav-search-input"
          className="topnav-search-input"
          placeholder="Search staff or shifts..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            className="topnav-search-clear"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <kbd className="topnav-search-kbd">Ctrl K</kbd>
      </div>

      {/* Notifications bell */}
      <div className="topnav-dropdown-anchor" ref={notifRef}>
        <button
          className="topnav-icon-btn"
          onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
          aria-label={`Notifications — ${unreadCount} active`}
        >
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount}</span>
          )}
        </button>

        {notifOpen && (
          <div className="topnav-dropdown notif-dropdown">
            <div className="dropdown-header">
              Needs Attention
              {unreadCount > 0 && <span className="dropdown-count">{unreadCount}</span>}
            </div>
            {alerts.length === 0 ? (
              <div className="dropdown-empty">✅ All clear — no active alerts</div>
            ) : (
              <div className="notif-list">
                {alerts.map((alert, i) => (
                  <button
                    key={i}
                    className="notif-item"
                    onClick={() => {
                      onNavigate(alert.navigateTo || "dashboard");
                      setNotifOpen(false);
                    }}
                  >
                    <span className={`notif-dot notif-dot--${alert.type}`} />
                    <div className="notif-content">
                      <div className="notif-category">{alert.category}</div>
                      <div className="notif-message">{alert.message}</div>
                    </div>
                    <span className="notif-arrow">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help */}
      <button
        className="topnav-icon-btn"
        onClick={() => setHelpOpen(true)}
        aria-label="Open compliance guide"
      >
        ❓
      </button>

      {/* Profile avatar */}
      <div className="topnav-dropdown-anchor" ref={profileRef}>
        <div
          className="topnav-avatar"
          onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
          role="button"
          tabIndex={0}
          aria-label="Profile menu"
          onKeyDown={e => e.key === "Enter" && setProfileOpen(o => !o)}
        >
          {role === "admin" ? "A" : "S"}
        </div>

        {profileOpen && (
          <div className="topnav-dropdown profile-dropdown">
            {/* Profile header */}
            <div className="profile-header">
              <div className="profile-avatar-lg">{role === "admin" ? "A" : "S"}</div>
              <div>
                <div className="profile-name">
                  {role === "admin" ? "Admin" : "Clinical Staff"}
                </div>
                <div className="profile-role">
                  {role === "admin" ? "Rota Manager" : "Read-Only Access"}
                </div>
                <div className="profile-facility">City General · Clinical Ops</div>
              </div>
            </div>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item"
              onClick={() => { setProfileOpen(false); alert("Account settings panel coming soon."); }}
            >
              ⚙️ Account Settings
            </button>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item dropdown-item--danger"
              onClick={() => { setProfileOpen(false); alert("Logged out."); }}
            >
              ↩️ Logout
            </button>
          </div>
        )}
      </div>

      {/* Help modal (rendered in-place, position: fixed so it escapes the nav) */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </nav>
  );
}
