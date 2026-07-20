import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
import { buildAlerts } from "../utils/alerts";

function toInputDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDays(dateText, days) {
  const d = new Date(`${dateText}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

const RotaContext = createContext(null);

export function RotaProvider({ children }) {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [rota, setRota] = useState({});
  const [swapRequests, setSwapRequests] = useState([]);
  const [absences, setAbsences] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null); // null means logged out

  // Global Configuration State
  const [industryTemplate, setIndustryTemplate] = useState("dental");

  const getLabel = useCallback((type) => {
    if (industryTemplate === "dental") {
      return type === "location" ? "SURGERY" : "Practitioner";
    }
    if (industryTemplate === "care_home") {
      return type === "location" ? "UNIT / FLOOR" : "Carer";
    }
    if (industryTemplate === "physio") {
      return type === "location" ? "TREATMENT ROOM" : "Therapist";
    }
    if (industryTemplate === "general") {
      return type === "location" ? "LOCATION" : "Staff";
    }
    // general default
    return type === "location" ? "LOCATION" : "Staff";
  }, [industryTemplate]);

  const getDefaultLocations = useCallback(() => {
    if (industryTemplate === "dental") return ["Surgery 1", "Surgery 2", "Surgery 3", "Hygiene Suite", "Decon / LDU"];
    if (industryTemplate === "physio") return ["Treatment Room 1", "Treatment Room 2", "Rehab Gym", "Assessment Bay"];
    if (industryTemplate === "care_home") return ["Ground Floor Residential", "Memory Care Wing", "First Floor Nursing", "Respite Unit"];
    return ["Consultation Room 1", "Triage Bay", "Minor Ops Suite", "Outpatients Ward"];
  }, [industryTemplate]);

  const login = (user) => {
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const loadData = useCallback(async () => {
    try {
      const [emp, shf, rta, swp, abs, rawAssigns] = await Promise.all([
        api.getEmployees(),
        api.getShifts(),
        api.getWeek(selectedDate),
        api.getSwapRequests(),
        api.getAbsences(),
        api.getAssignments()
      ]);
      
      let finalEmployees = emp;
      if (emp.length === 0) {
        finalEmployees = [
          { id: 1, name: "Dr. Sarah Jenkins", role: "Dentist", contracted_hours: 40, preferred_shifts: "Morning", is_locum: false },
          { id: 2, name: "Dr. Ahmed Khan", role: "Orthodontist", contracted_hours: 32, preferred_shifts: "Any", is_locum: false },
          { id: 3, name: "Dr. Emily Chen", role: "Dentist", contracted_hours: 40, preferred_shifts: "Any", is_locum: false },
          { id: 4, name: "Nurse Thompson", role: "Nurse", contracted_hours: 36, preferred_shifts: "Afternoon", is_locum: false },
          { id: 5, name: "Chloe Evans", role: "Hygienist", contracted_hours: 20, preferred_shifts: "Morning", is_locum: false },
        ];
      }
      setEmployees(finalEmployees);

      let finalShifts = shf;
      let finalAssigns = rawAssigns;
      
      let finalAbsences = abs;
      if (abs.length === 0) {
        const todayStr = toInputDate(new Date());
        finalAbsences = [
          { id: 1, employee_id: 1, employee_name: "Dr. Sarah Jenkins", start_date: todayStr, end_date: todayStr, reason: "Annual Leave", status: "Approved", notes: "Pre-booked holiday" }
        ];
      }
      setAbsences(finalAbsences);

      setRota(rta);

      if (shf.length === 0) {
        const todayStr = toInputDate(new Date());
        const locs = getDefaultLocations();
        finalShifts = [
          { id: 101, date: todayStr, start_time: "08:00", end_time: "12:00", location: locs[0], required_grade: getLabel("role"), is_published: true },
          { id: 102, date: todayStr, start_time: "13:00", end_time: "17:00", location: locs[0], required_grade: getLabel("role"), is_published: true },
          { id: 103, date: todayStr, start_time: "09:00", end_time: "15:00", location: locs[1], required_grade: "Specialist", is_published: true },
          { id: 104, date: todayStr, start_time: "08:30", end_time: "16:30", location: locs[3], required_grade: "Support", is_published: true },
          { id: 105, date: addDays(todayStr, 1), start_time: "10:00", end_time: "18:00", location: locs[2], required_grade: getLabel("role"), is_published: true },
          { id: 106, date: addDays(todayStr, 1), start_time: "09:00", end_time: "14:00", location: locs[4], required_grade: "Support", is_published: true },
          { id: 107, date: addDays(todayStr, 2), start_time: "07:00", end_time: "19:00", location: locs[0], required_grade: getLabel("role"), is_published: true },
          { id: 108, date: addDays(todayStr, 2), start_time: "08:00", end_time: "16:00", location: locs[3], required_grade: "Support", is_published: true },
          { id: 109, date: addDays(todayStr, -1), start_time: "08:00", end_time: "18:00", location: locs[1], required_grade: getLabel("role"), is_published: true },
          { id: 110, date: addDays(todayStr, 3), start_time: "09:00", end_time: "17:00", location: locs[2], required_grade: getLabel("role"), is_published: false },
          { id: 111, date: addDays(todayStr, 5), start_time: "10:00", end_time: "16:00", location: locs[4], required_grade: "Support", is_published: true },
          { id: 112, date: addDays(todayStr, 10), start_time: "08:00", end_time: "14:00", location: locs[0], required_grade: getLabel("role"), is_published: true },
          { id: 113, date: addDays(todayStr, 15), start_time: "09:00", end_time: "17:00", location: locs[1], required_grade: "Specialist", is_published: true },
          { id: 114, date: addDays(todayStr, -5), start_time: "08:00", end_time: "16:00", location: locs[3], required_grade: "Support", is_published: true },
          { id: 115, date: addDays(todayStr, 20), start_time: "10:00", end_time: "18:00", location: locs[4], required_grade: "Support", is_published: true },
        ];
        finalAssigns = [
          { shift_id: 101, name: "Dr. Sarah Jenkins", role: getLabel("role") },
          { shift_id: 102, name: "Dr. Sarah Jenkins", role: getLabel("role") },
          { shift_id: 103, name: "Dr. Ahmed Khan", role: "Specialist" },
          { shift_id: 104, name: "Chloe Evans", role: "Support" },
          { shift_id: 105, name: "Dr. Emily Chen", role: getLabel("role") },
          { shift_id: 106, name: "Nurse Thompson", role: "Support" },
          { shift_id: 107, name: "Dr. Sarah Jenkins", role: getLabel("role") },
          { shift_id: 109, name: "Dr. Ahmed Khan", role: getLabel("role") },
          { shift_id: 111, name: "Nurse Thompson", role: "Support" },
          { shift_id: 112, name: "Dr. Emily Chen", role: getLabel("role") },
        ];
      }

      setShifts(finalShifts);
      setAssignments(finalAssigns);
      
      setSwapRequests(swp);
      setAbsences(abs);
      setBackendOk(true);
    } catch (err) {
      console.error(err);
      setBackendOk(false);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, getLabel, getDefaultLocations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const alerts = useMemo(() => {
    return buildAlerts(rota, swapRequests, employees, selectedDate);
  }, [rota, swapRequests, employees, selectedDate]);

  const locations = useMemo(() => {
    const activeShifts = shifts || [];
    if (activeShifts.length > 0) {
      return [...new Set(activeShifts.map(s => s.location))].sort();
    }
    return getDefaultLocations();
  }, [shifts, getDefaultLocations]);

  const value = {
    employees,
    shifts,
    assignments,
    rota,
    swapRequests,
    absences,
    alerts,
    locations,
    loading,
    backendOk,
    selectedDate,
    setSelectedDate,
    refreshAll: loadData,
    currentUser,
    login,
    logout,
    industryTemplate,
    setIndustryTemplate,
    getLabel,
    getDefaultLocations,
    setShifts,
    setAssignments,
    setEmployees,
    setAbsences
  };

  return <RotaContext.Provider value={value}>{children}</RotaContext.Provider>;
}

export function useRota() {
  return useContext(RotaContext);
}
