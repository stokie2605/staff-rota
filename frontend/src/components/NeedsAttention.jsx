import { buildAlerts } from "../utils/alerts";

export function NeedsAttention({ alerts, onNavigate }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="needs-attention">
        <div className="needs-attention-title">✅ All Clear Today</div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No compliance violations, unstaffed shifts, or pending requests.
        </div>
      </div>
    );
  }

  return (
    <div className="needs-attention">
      <div className="needs-attention-title">❗ Needs Attention Today</div>
      {alerts.map((alert, i) => (
        <AlertCard key={i} alert={alert} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function AlertCard({ alert, onNavigate }) {
  return (
    <div className="alert-card">
      <div className={`alert-accent ${alert.type}`} />
      <div className="alert-body">
        <div>
          <span className={`alert-badge ${alert.type}`}>{alert.type.toUpperCase()}</span>
          <span className="alert-category">{alert.category}</span>
        </div>
        <div className="alert-message">{alert.message}</div>
      </div>
      <div className="alert-actions">
        {alert.type === "critical" && (
          <button className="btn btn-critical" onClick={() => onNavigate("assignments")}>
            Fix Now
          </button>
        )}
        {alert.type === "compliance" && (
          <>
            <button className="btn btn-outline" onClick={() => onNavigate("assignments")}>
              Change Staff
            </button>
            <button className="btn btn-compliance" onClick={() => onNavigate("audit")}>
              Approve Override
            </button>
          </>
        )}
        {alert.type === "request" && (
          <button className="btn btn-request" onClick={() => onNavigate("swaps")}>
            Approve Swap
          </button>
        )}
      </div>
    </div>
  );
}
