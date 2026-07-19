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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [emp, shf, rta, swp, abs] = await Promise.all([
        api.getEmployees(),
        api.getShifts(),
        api.getWeeklyRota(selectedDate),
        api.getSwapRequests(),
        api.getAbsences() // Note: Need to add this to api.js
      ]);
      setEmployees(emp);
      setShifts(shf);
      setRota(rta);
      
      // Extract assignments from rota structure for easier list rendering
      const assigns = [];
      for (const date in rta) {
        for (const slot in rta[date]) {
          rta[date][slot].assignments.forEach(a => assigns.push(a));
        }
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
    refreshAll: loadData
  };

  return <RotaContext.Provider value={value}>{children}</RotaContext.Provider>;
}

export function useRota() {
  return useContext(RotaContext);
}
