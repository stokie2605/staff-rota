import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
import { buildAlerts } from "../utils/alerts";

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
      setEmployees(emp);
      setShifts(shf);
      setRota(rta);
      const assigns = rawAssigns.map(a => {
        const employee = emp.find(e => e.id === a.employee_id) || {};
        return {
          ...a,
          name: employee.name,
          role: employee.role,
          grade: employee.grade
        };
      });
      setAssignments(assigns);
      setSwapRequests(swp);
      setAbsences(abs);
      setBackendOk(true);
    } catch (err) {
      console.error(err);
      setBackendOk(false);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const alerts = useMemo(() => {
    return buildAlerts(rota, swapRequests, employees, selectedDate);
  }, [rota, swapRequests, employees, selectedDate]);

  const locations = useMemo(() => {
    return [...new Set((shifts || []).map(s => s.location))].sort();
  }, [shifts]);

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
    getDefaultLocations
  };

  return <RotaContext.Provider value={value}>{children}</RotaContext.Provider>;
}

export function useRota() {
  return useContext(RotaContext);
}
