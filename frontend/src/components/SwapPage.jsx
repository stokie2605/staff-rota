import { useEffect, useState } from "react";
import { api } from "../services/api";

export function SwapPage({ employees, refresh, setNotice }) {
  const [swaps, setSwaps] = useState([]);
  const [recipients, setRecipients] = useState({}); // swapId -> selectedEmployeeId
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Compliance warning override states
  const [warning, setWarning] = useState("");
  const [overrideSwapId, setOverrideSwapId] = useState(null);
  const [overrideRecipientId, setOverrideRecipientId] = useState(null);
  const [showOverride, setShowOverride] = useState(false);
  const [reasonCode, setReasonCode] = useState("EMERGENCY_OVERRIDE");
  const [justification, setJustification] = useState("");

  async function loadSwaps() {
    setLoading(true);
    try {
      const data = await api.getSwapRequests();
      setSwaps(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSwaps();
  }, []);

  function handleRecipientChange(swapId, employeeId) {
    setRecipients(prev => ({
      ...prev,
      [swapId]: employeeId
    }));
  }

  async function approveSwap(swapId, forceRecipientId = null, bypassWarnings = false) {
    setError("");
    const targetId = forceRecipientId || recipients[swapId];
    if (!targetId) {
      setError("Please select a replacement employee to cover this shift.");
      return;
    }

    try {
      const payload = {
        target_employee_id: Number(targetId),
        ignore_warnings: bypassWarnings,
        reason_code: bypassWarnings ? reasonCode : "ROSTER_ADJUSTMENT",
        override_justification: bypassWarnings ? justification : undefined
      };

      await api.approveSwapRequest(swapId, payload);
      
      // Clear forms and reload
      setWarning("");
      setShowOverride(false);
      setOverrideSwapId(null);
      setOverrideRecipientId(null);
      setJustification("");
      setNotice("Shift swap executed successfully!");
      refresh();
      loadSwaps();
    } catch (err) {
      if (err.type === "COMPLIANCE_WARNING") {
        setWarning(err.message);
        setOverrideSwapId(swapId);
        setOverrideRecipientId(targetId);
        setShowOverride(true);
      } else {
        setError(err.message);
      }
    }
  }

  if (loading) {
    return <div className="panel loading-panel">Loading swap board...</div>;
  }

  return (
    <section className="panel-grid" style={{ display: "block" }}>
      <div className="panel table-panel">
        <h3>Shift Swap Board</h3>
        <p className="subtitle" style={{ marginBottom: "20px" }}>
          Manage requests from staff wishing to trade scheduled shifts. Replacement coverage must match the grade requirement.
        </p>

        {error && <p className="error-message" style={{ color: "red", fontWeight: "bold", marginBottom: "15px" }}>{error}</p>}

        {/* Override Modal/Banner */}
        {showOverride && (
          <div className="override-panel" style={{ backgroundColor: "var(--compliance-bg)", borderLeft: "4px solid var(--compliance)", padding: "16px", marginBottom: "20px", borderRadius: "8px" }}>
            <h4 style={{ color: "var(--compliance)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.2em" }}>⚠️</span> Swap compliance override required
            </h4>
            <p style={{ color: "var(--text)", fontSize: "0.85rem", marginBottom: "16px", lineHeight: "1.4" }}>{warning}</p>
            
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="form-group" style={{ marginBottom: "0", minWidth: "200px" }}>
                <label>Reason Code</label>
                <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                  <option value="EMERGENCY_OVERRIDE">Emergency Ward Coverage</option>
                  <option value="SICKNESS_COVER">Sickness Cover</option>
                  <option value="LEAVE_COVER">Leave Cover</option>
                </select>
              </div>
              
              <div className="form-group" style={{ flexGrow: "1", minWidth: "250px", marginBottom: "0" }}>
                <label>Override Justification</label>
                <input 
                  type="text" 
                  placeholder="Justification statement (minimum 5 characters)..." 
                  value={justification} 
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  className="btn btn-compliance" 
                  onClick={() => approveSwap(overrideSwapId, overrideRecipientId, true)}
                >
                  Force Approve Swap
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={() => {
                    setShowOverride(false);
                    setOverrideSwapId(null);
                    setOverrideRecipientId(null);
                    setWarning("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {swaps.length === 0 ? (
          <p className="empty-state" style={{ padding: "40px", textAlign: "center" }}>No active swap requests.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Requesting Staff</th>
                <th>Shift Details</th>
                <th>Required Grade</th>
                <th>Cover Type</th>
                <th>Select Cover Staff</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {swaps.map((swap) => {
                // Filter staff of identical grade to fulfill swap
                const qualifiedStaff = employees.filter(
                  e => e.id !== swap.requesting_employee_id && e.grade === swap.shift_required_grade
                );

                return (
                  <tr key={swap.id}>
                    <td>
                      <strong>{swap.requesting_employee_name}</strong>
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>{swap.requesting_employee_grade}</div>
                    </td>
                    <td>
                      {swap.shift_date} {swap.shift_slot}
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>{swap.shift_location}</div>
                    </td>
                    <td><span className="pill grade-pill">{swap.shift_required_grade}</span></td>
                    <td>
                      {swap.target_employee_name === "Open Swap Pool" ? (
                        <span className="pill" style={{ backgroundColor: "#e2e3e5", color: "#383d41" }}>Open Pool</span>
                      ) : (
                        <span className="pill" style={{ backgroundColor: "#d1ecf1", color: "#0c5460" }}>
                          Direct swap with {swap.target_employee_name}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <select 
                          value={recipients[swap.id] || ""} 
                          onChange={(e) => handleRecipientChange(swap.id, e.target.value)}
                          style={{ padding: "5px", width: "100%", minWidth: "180px" }}
                        >
                          <option value="">Choose cover employee...</option>
                          {qualifiedStaff.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} {emp.is_locum ? "[Locum]" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => approveSwap(swap.id)}
                        disabled={!recipients[swap.id]}
                      >
                        Approve Swap
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
