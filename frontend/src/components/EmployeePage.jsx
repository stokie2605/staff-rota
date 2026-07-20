import React, { useState } from "react";
import { useRota } from "../context/RotaContext";

export function EmployeePage() {
  const { employees, setEmployees, shifts, assignments, getLabel } = useRota();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats calculation
  const totalStaff = employees.length;
  const totalContracted = employees.reduce((sum, emp) => sum + (emp.contracted_hours || 0), 0);
  
  // Calculate scheduled hours
  const calculateScheduledHours = (empName) => {
    let totalMins = 0;
    const empAssigns = assignments.filter(a => a.name === empName);
    empAssigns.forEach(a => {
      const shift = shifts.find(s => s.id === a.shift_id);
      if (shift) {
        const [sh, sm] = shift.start_time.split(":").map(Number);
        let [eh, em] = shift.end_time.split(":").map(Number);
        if (eh <= sh) eh += 24;
        totalMins += (eh * 60 + em) - (sh * 60 + sm);
      }
    });
    return (totalMins / 60).toFixed(1);
  };

  const removeEmployee = (id) => {
    const newEmp = employees.filter(e => e.id !== id);
    setEmployees(newEmp);
  };

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text)" }}>{getLabel("staff")} Directory</h2>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)" }}>Manage your team and view their scheduled hours.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Add {getLabel("staff")}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>Total {getLabel("staff")}</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text)", marginTop: "8px" }}>{totalStaff}</div>
        </div>
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>Total Contracted</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text)", marginTop: "8px" }}>{totalContracted} <span style={{fontSize: "1rem", color: "var(--text-muted)"}}>hrs</span></div>
        </div>
      </div>

      <div className="panel" style={{ flex: 1, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ overflowY: "auto", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Name</th>
                <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Role / Specialty</th>
                <th style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Contracted Hrs</th>
                <th style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Scheduled Hrs</th>
                <th style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const scheduled = parseFloat(calculateScheduledHours(emp.name));
                const overHours = emp.contracted_hours && scheduled > emp.contracted_hours;
                
                return (
                  <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", fontWeight: "bold", color: "var(--text)" }}>{emp.name}</td>
                    <td style={{ padding: "16px", color: "var(--text)" }}>{emp.role}</td>
                    <td style={{ padding: "16px", textAlign: "center", color: "var(--text)" }}>{emp.contracted_hours || 0}h</td>
                    <td style={{ padding: "16px", textAlign: "center", color: overHours ? "var(--critical)" : "var(--primary)", fontWeight: "bold" }}>
                      {scheduled}h
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      {emp.is_locum ? (
                        <span style={{ background: "var(--warning)", color: "#fff", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>LOCUM</span>
                      ) : (
                        <span style={{ background: "var(--success-bg, #e6f4ea)", color: "var(--success, #1e8e3e)", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>ACTIVE</span>
                      )}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.8rem", color: "var(--critical)", borderColor: "var(--critical-bg)" }} onClick={() => removeEmployee(emp.id)}>Remove</button>
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>No {getLabel("staff").toLowerCase()} members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <AddEmployeeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function AddEmployeeModal({ isOpen, onClose }) {
  const { employees, setEmployees, getLabel } = useRota();
  
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [contractedHours, setContractedHours] = useState("40");
  const [preferredShifts, setPreferredShifts] = useState("Any");
  const [isLocum, setIsLocum] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEmp = {
      id: Date.now(),
      name,
      role,
      contracted_hours: parseFloat(contractedHours) || 0,
      preferred_shifts: preferredShifts,
      is_locum: isLocum
    };
    
    setEmployees([...employees, newEmp]);
    
    // reset
    setName("");
    setRole("");
    setContractedHours("40");
    setPreferredShifts("Any");
    setIsLocum(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: "450px", maxWidth: "90%", background: "var(--surface)", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", padding: "24px", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ margin: 0, color: "var(--text)" }}>Add {getLabel("staff")}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Full Name
            <input type="text" required value={name} onChange={e => setName(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} placeholder="e.g. Dr. Jane Smith" />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Clinical Role / Specialty
            <input type="text" required value={role} onChange={e => setRole(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} placeholder="e.g. Senior Nurse, Orthodontist" />
          </label>

          <div style={{ display: "flex", gap: "12px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem", flex: 1 }}>
              Contracted Hours/Wk
              <input type="number" required value={contractedHours} onChange={e => setContractedHours(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem", flex: 1 }}>
              Preferred Shifts
              <select value={preferredShifts} onChange={e => setPreferredShifts(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
                <option value="Any">Any</option>
                <option value="Morning">Morning Only</option>
                <option value="Afternoon">Afternoon Only</option>
                <option value="Night">Night Shifts</option>
              </select>
            </label>
          </div>
          
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text)", fontSize: "0.9rem", cursor: "pointer", marginTop: "8px" }}>
            <input type="checkbox" checked={isLocum} onChange={e => setIsLocum(e.target.checked)} style={{ width: "16px", height: "16px" }} />
            Register as Locum / Agency Staff
          </label>

          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, padding: "12px" }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: "12px" }}>Add {getLabel("staff")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
