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
      return type === "location" ? "Chair" : "Practitioner";
    }
    if (industryTemplate === "care_home") {
      return type === "location" ? "Unit/Floor" : "Carer";
    }
    if (industryTemplate === "physio") {
      return type === "location" ? "Treatment Room" : "Therapist";
    }
    // general default
    return type === "location" ? "Location" : "Staff";
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
    getLabel
  };

  return <RotaContext.Provider value={value}>{children}</RotaContext.Provider>;
}

export function useRota() {
  return useContext(RotaContext);
}
