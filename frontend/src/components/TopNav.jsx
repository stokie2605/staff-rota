const TABS = ["Dashboard", "Roster", "Staff", "Locations"];

export function TopNav({ activeTab, setActiveTab }) {
  return (
    <nav className="topnav">
      <span className="topnav-brand">RotaCare</span>

      <div className="topnav-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`topnav-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="topnav-right">
        <div className="topnav-search">
          <span>🔍</span>
          <span>Search staff or shifts...</span>
        </div>
        <button className="topnav-icon-btn" title="Notifications">🔔</button>
        <button className="topnav-icon-btn" title="Help">❓</button>
        <div className="topnav-avatar" title="Your account">A</div>
      </div>
    </nav>
  );
}
