import React, { useState, useEffect } from "react";
import { useRota } from "../context/RotaContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function ShiftModal({ isOpen, onClose, initialData }) {
  const { shifts, setShifts, assignments, setAssignments, getDefaultLocations, getLabel, employees } = useRota();
  const { addToast } = useToast();

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [assignee, setAssignee] = useState("");

  const locations = getDefaultLocations();
  const roleLabel = getLabel("role");
  const locationLabel = getLabel("location");

  useEffect(() => {
    if (isOpen) {
      setDate(initialData?.date || new Date().toISOString().slice(0, 10));
      setStartTime(initialData?.start_time || "09:00");
      setEndTime(initialData?.end_time || "17:00");
      setLocation(initialData?.location || locations[0] || "");
      setRole(initialData?.required_grade || roleLabel || "");
      
      if (initialData?.id) {
        const existingAssigns = assignments.filter(a => a.shift_id === initialData.id);
        if (existingAssigns.length > 0) {
          setAssignee(existingAssigns[0].name);
        } else {
          setAssignee("");
        }
      } else {
        setAssignee("");
      }
    }
  }, [isOpen, initialData, locations, roleLabel, assignments]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    let shiftId = initialData?.id;
    let newShifts = [...shifts];
    let newAssignments = [...assignments];
    let actualShiftId = shiftId;
    let isOffline = false;

    if (shiftId) {
      // Edit existing
      const index = newShifts.findIndex(s => s.id === shiftId);
      const updatedShift = { ...newShifts[index], date, start_time: startTime, end_time: endTime, location, required_grade: role };
      if (index >= 0) {
        newShifts[index] = updatedShift;
      }
      try {
        await api.updateShift(shiftId, updatedShift);
      } catch (err) {
        isOffline = true;
        addToast("Offline Mode: Shift update saved locally", "warning");
      }
    } else {
      // Create new
      const payload = { date, start_time: startTime, end_time: endTime, location, required_grade: role, is_published: false };
      try {
        const result = await api.createShift(payload);
        actualShiftId = result.id || Date.now();
        newShifts.push({ ...payload, id: actualShiftId });
      } catch (err) {
        isOffline = true;
        actualShiftId = Date.now(); // mock ID
        newShifts.push({ ...payload, id: actualShiftId });
        addToast("Offline Mode: New shift saved locally", "warning");
      }
    }

    // Handle assignments
    if (assignee && assignee !== "") {
      const assignIndex = newAssignments.findIndex(a => a.shift_id === actualShiftId);
      const emp = employees.find(e => e.name === assignee);
      const empId = emp ? emp.id : null;

      if (assignIndex >= 0) {
        newAssignments[assignIndex] = { ...newAssignments[assignIndex], name: assignee };
        // Could call updateAssignment here if API supports it
      } else {
        const newAssign = { shift_id: actualShiftId, employee_id: empId, name: assignee, role: role };
        try {
          if (!isOffline) {
             const result = await api.createAssignment(newAssign);
             newAssignments.push({ ...newAssign, assignment_id: result.id || Date.now() });
          } else {
             newAssignments.push({ ...newAssign, assignment_id: Date.now() });
          }
        } catch (err) {
          newAssignments.push({ ...newAssign, assignment_id: Date.now() });
          if (!isOffline) addToast("Offline Mode: Assignment saved locally", "warning");
        }
      }
    } else {
      // unassign
      newAssignments = newAssignments.filter(a => a.shift_id !== actualShiftId);
    }

    setShifts(newShifts);
    setAssignments(newAssignments);
    onClose();
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: "400px", maxWidth: "90%", background: "var(--surface)", height: "100%", boxShadow: "-4px 0 15px rgba(0,0,0,0.1)", padding: "24px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ margin: 0, color: "var(--text)" }}>{initialData?.id ? "Edit Shift" : "New Shift"}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, overflowY: "auto" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Date
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
          </label>

          <div style={{ display: "flex", gap: "12px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem", flex: 1 }}>
              Start Time
              <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem", flex: 1 }}>
              End Time
              <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            {locationLabel}
            <select value={location} onChange={e => setLocation(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Required Role
            <input type="text" required value={role} onChange={e => setRole(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--text)", fontWeight: "bold", fontSize: "0.9rem" }}>
            Assignee
            <select value={assignee} onChange={e => setAssignee(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
              <option value="">-- Unassigned --</option>
              {employees.map(emp => (
                <option key={emp.id || emp.name} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </label>

          <div style={{ marginTop: "auto", display: "flex", gap: "12px", paddingTop: "24px" }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, padding: "12px" }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: "12px" }}>Save Shift</button>
          </div>
        </form>
      </div>
    </div>
  );
}
