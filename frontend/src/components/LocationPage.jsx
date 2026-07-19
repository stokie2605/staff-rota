import { useMemo } from "react";
import { useRota } from "../context/RotaContext";

export function LocationPage({ onNavigate }) {
  const { shifts, assignments } = useRota();
  // Aggregate data by unique location
  const locationStats = useMemo(() => {
    const stats = {};
    
    (shifts || []).forEach(shift => {
      const loc = shift.location;
      if (!stats[loc]) {
        stats[loc] = {
          name: loc,
          totalShifts: 0,
          unfilledShifts: 0,
          requiredGrades: new Set()
        };
      }
      
      stats[loc].totalShifts += 1;
      stats[loc].requiredGrades.add(shift.required_grade);
      
      const isFilled = (assignments || []).some(a => a.shift_id === shift.id);
      if (!isFilled) {
        stats[loc].unfilledShifts += 1;
      }
    });

    return Object.values(stats).sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts, assignments]);

  return (
    <section className="panel-grid" style={{ display: "block" }}>
      <div className="panel table-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h3 style={{ marginBottom: "8px" }}>Ward & Location Directory</h3>
            <p className="subtitle">
              Overview of active clinical environments and their current staffing demand.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate("shifts")}>
            + Add New Shift
          </button>
        </div>

        {locationStats.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No locations active. Add a shift to register a new ward.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {locationStats.map(loc => (
              <div 
                key={loc.name} 
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "20px",
                  background: "var(--surface)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ 
                    width: "40px", 
                    height: "40px", 
                    borderRadius: "8px", 
                    background: "var(--surface-2)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "1.2rem"
                  }}>
                    🏥
                  </div>
                  <h4 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text)" }}>{loc.name}</h4>
                </div>
                
                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ flex: 1, padding: "10px", background: "var(--surface-2)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Shifts</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)", marginTop: "4px" }}>{loc.totalShifts}</div>
                  </div>
                  <div style={{ flex: 1, padding: "10px", background: loc.unfilledShifts > 0 ? "var(--critical-bg)" : "var(--success-bg)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: loc.unfilledShifts > 0 ? "var(--critical)" : "var(--success)", fontWeight: 600, textTransform: "uppercase" }}>Unfilled</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: loc.unfilledShifts > 0 ? "var(--critical)" : "var(--success)", marginTop: "4px" }}>{loc.unfilledShifts}</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>Required Clinical Grades:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {Array.from(loc.requiredGrades).map(grade => (
                      <span key={grade} className="pill grade-pill">{grade}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
