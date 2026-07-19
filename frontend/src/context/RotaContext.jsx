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
      setLoading(true);
      const [emp, shf, rta, swp, abs] = await Promise.all([
        api.getEmployees(),
        api.getShifts(),
        api.getWeek(selectedDate),
        api.getSwapRequests(),
        api.getAbsences() // Note: Need to add this to api.js
      ]);
      setEmployees(emp);
      setShifts(shf);
      setRota(rta);
      
      // Extract assignments from rota structure for easier list rendering
      const assigns = [];
      if (rta && rta.days) {
        rta.days.forEach(day => {
          (day.shifts || []).forEach(shift => {
            (shift.staff || []).forEach(st => {
              assigns.push({
                ...st,
                shift_id: shift.id,
                shift_date: day.date
              });
            });
          });
        });
      }
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

  const value = {
    employees,
    shifts,
    assignments,
    rota,
    swapRequests,
    absences,
    alerts,
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
