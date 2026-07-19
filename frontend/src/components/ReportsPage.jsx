import React, { useMemo } from "react";
import { useRota } from "../context/RotaContext";

export function ReportsPage() {
  const { employees, shifts, assignments, loading } = useRota();

  const stats = useMemo(() => {
    const e = employees || [];
    const s = shifts || [];
    const a = assignments || [];

    const totalStaff = e.length;
    const totalLocums = e.filter(emp => emp.is_locum).length;
    
    const totalShifts = s.length;
    const filledShifts = new Set(a.map(assign => assign.shift_id)).size;
    const unfilledShifts = totalShifts - filledShifts;
    
    const locumOffers = s.filter(shift => shift.offered_to_locum_pool).length;

    // By Department Breakdown
    const deptStats = {};
    e.forEach(emp => {
      if (!deptStats[emp.department]) deptStats[emp.department] = { staff: 0, shifts: 0, unfilled: 0 };
      deptStats[emp.department].staff++;
    });
    s.forEach(shift => {
      const dept = shift.location;
      if (!deptStats[dept]) deptStats[dept] = { staff: 0, shifts: 0, unfilled: 0 };
      deptStats[dept].shifts++;
      const isFilled = a.some(assign => assign.shift_id === shift.id);
      if (!isFilled) deptStats[dept].unfilled++;
    });

    const deptArray = Object.keys(deptStats).map(key => ({
      department: key,
      ...deptStats[key]
    })).sort((a, b) => b.shifts - a.shifts);

    return { totalStaff, totalLocums, totalShifts, filledShifts, unfilledShifts, locumOffers, deptArray };
  }, [employees, shifts, assignments]);

  if (loading) return <div className="panel loading-panel">Loading reports...</div>;

  return (
    <section className="reports-section">
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1>Operations Reports</h1>
          <p className="page-subtitle">Overview of staff deployment and rota compliance</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderTop: "4px solid var(--primary)" }}>
          <span className="kpi-label">Total Staff</span>
          <strong className="kpi-value">{stats.totalStaff}</strong>
        </div>
        <div className="kpi-card" style={{ borderTop: "4px solid var(--compliance)" }}>
          <span className="kpi-label">Locums Registered</span>
          <strong className="kpi-value">{stats.totalLocums}</strong>
        </div>
        <div className="kpi-card" style={{ borderTop: "4px solid var(--critical)" }}>
          <span className="kpi-label">Unfilled Shifts</span>
          <strong className="kpi-value">{stats.unfilledShifts}</strong>
        </div>
        <div className="kpi-card" style={{ borderTop: "4px solid var(--request)" }}>
          <span className="kpi-label">Locum Offers Active</span>
          <strong className="kpi-value">{stats.locumOffers}</strong>
        </div>
      </div>

      <div className="panel table-panel" style={{ marginTop: "24px" }}>
        <h3>Departmental Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Department / Ward</th>
              <th>Registered Staff</th>
              <th>Total Scheduled Shifts</th>
              <th>Unfilled Shifts</th>
              <th>Fulfillment %</th>
            </tr>
          </thead>
          <tbody>
            {stats.deptArray.map(dept => {
              const fulfillPct = dept.shifts > 0 ? Math.round(((dept.shifts - dept.unfilled) / dept.shifts) * 100) : 100;
              let pctColor = "var(--success)";
              if (fulfillPct < 80) pctColor = "var(--compliance)";
              if (fulfillPct < 50) pctColor = "var(--critical)";

              return (
                <tr key={dept.department}>
                  <td><strong>{dept.department}</strong></td>
                  <td>{dept.staff}</td>
                  <td>{dept.shifts}</td>
                  <td>
                    {dept.unfilled > 0 ? (
                      <span style={{ color: "var(--critical)", fontWeight: "bold" }}>{dept.unfilled} Warning</span>
                    ) : (
                      <span style={{ color: "var(--text-faint)" }}>0</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: "bold", color: pctColor }}>{fulfillPct}%</span>
                      <div style={{ flex: 1, height: "6px", background: "var(--surface-2)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${fulfillPct}%`, height: "100%", background: pctColor }} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {stats.deptArray.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
