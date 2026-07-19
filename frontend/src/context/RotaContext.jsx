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
    refreshAll: loadData
  };

  return <RotaContext.Provider value={value}>{children}</RotaContext.Provider>;
}

export function useRota() {
  return useContext(RotaContext);
}
