import React, { useEffect, useState } from "react";
import { api } from "../services/api";

function formatTimestamp(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAuditLogs() {
      try {
        const data = await api.getAuditLogs();
        if (isMounted) {
          setLogs(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load audit logs");
          setLogs([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAuditLogs();
    return () => { isMounted = false; };
  }, []);

  // Standard safe fallbacks using clear styling properties
  if (loading) {
    return <div style={{ padding: "40px", color: "#334155", textAlign: "center", fontSize: "1.2rem" }}>Loading system audit logs...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px", color: "#dc2626", backgroundColor: "#fef2f2", borderRadius: "8px" }}>Error: {error}</div>;
  }

  if (logs.length === 0) {
    return <div style={{ padding: "40px", color: "#64748b", textAlign: "center" }}>No logs have been recorded yet.</div>;
  }

  return (
    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginTop: "20px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", color: "#334155" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ padding: "12px" }}>Timestamp</th>
            <th style={{ padding: "12px" }}>Action</th>
            <th style={{ padding: "12px" }}>Reason Code</th>
            <th style={{ padding: "12px" }}>Performed By</th>
            <th style={{ padding: "12px" }}>Details / Justification</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id ?? `${log.timestamp}-${log.action}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px", whiteSpace: "nowrap", fontSize: "0.9rem", color: "#64748b" }}>
                {formatTimestamp(log.timestamp)}
              </td>
              <td style={{ padding: "12px" }}>
                <span style={{ 
                  backgroundColor: log.action === "EMERGENCY_OVERRIDE" ? "#fef3c7" : "#fee2e2", 
                  color: log.action === "EMERGENCY_OVERRIDE" ? "#d97706" : "#991b1b", 
                  padding: "4px 8px", 
                  borderRadius: "6px", 
                  fontSize: "0.8rem", 
                  fontWeight: "600" 
                }}>
                  {log.action}
                </span>
              </td>
              <td style={{ padding: "12px" }}>
                {log.reason_code ? (
                  <span className="pill" style={{ fontSize: "0.75rem", backgroundColor: "#e2e3e5", color: "#383d41", padding: "2px 8px" }}>
                    {log.reason_code}
                  </span>
                ) : (
                  <span style={{ color: "#aaa" }}>-</span>
                )}
              </td>
              <td style={{ padding: "12px", fontWeight: "600" }}>{log.performed_by}</td>
              <td style={{ padding: "12px", fontSize: "0.95rem" }}>
                <div>{log.details}</div>
                {log.override_justification && (
                  <div style={{ fontStyle: "italic", fontSize: "0.85rem", color: "#b45309", marginTop: "4px" }}>
                    💡 Justification: "{log.override_justification}"
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}