const API_URL = "https://staff-rota-backend-o36l.onrender.com";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    if (typeof error.detail === "object") {
      const err = new Error(error.detail.message || "Request failed");
      err.type = error.detail.type;
      err.detail = error.detail;
      throw err;
    }
    throw new Error(error.detail || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getEmployees: () => request("/employees"),
  createEmployee: (employee) => request("/employees", { method: "POST", body: JSON.stringify(employee) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: "DELETE" }),
  getShifts: () => request("/shifts"),
  createShift: (shift) => request("/shifts", { method: "POST", body: JSON.stringify(shift) }),
  deleteShift: (id) => request(`/shifts/${id}`, { method: "DELETE" }),
  toggleLocumPool: (id) => request(`/shifts/${id}/locum-pool`, { method: "POST" }),
  getAssignments: () => request("/assignments"),
  createAssignment: (assignment) => request("/assignments", { method: "POST", body: JSON.stringify(assignment) }),
  deleteAssignment: (id, reasonCode = "ROSTER_ADJUSTMENT") => request(`/assignments/${id}?reason_code=${reasonCode}`, { method: "DELETE" }),
  
  // Swap endpoints
  getSwapRequests: () => request("/assignments/swap-requests"),
  createSwapRequest: (req) => request("/assignments/swap-request", { method: "POST", body: JSON.stringify(req) }),
  approveSwapRequest: (id, approval) => request(`/assignments/swap-request/${id}/approve`, { method: "POST", body: JSON.stringify(approval) }),
  
  getWeek: (date) => request(`/rota/week?date=${date}`),
  getAuditLogs: () => request("/audit-logs"),
  
  // Absences
  getAbsences: () => request("/absences"),
  createAbsence: (absence) => request("/absences", { method: "POST", body: JSON.stringify(absence) }),
  deleteAbsence: (id) => request(`/absences/${id}`, { method: "DELETE" }),
  
  // Publish
  publishShifts: (startDate, endDate) => request("/shifts/publish", { method: "POST", body: JSON.stringify({ start_date: startDate, end_date: endDate }) })
};

export async function downloadRotaCsv(date) {
  const response = await fetch(`${API_URL}/rota/export?date=${date}`);
  if (!response.ok) {
    throw new Error("Could not export rota");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `staffrota-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
