const API_URL = "http://localhost:8000";

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
  getAssignments: () => request("/assignments"),
  createAssignment: (assignment) => request("/assignments", { method: "POST", body: JSON.stringify(assignment) }),
  deleteAssignment: (id) => request(`/assignments/${id}`, { method: "DELETE" }),
  getWeek: (date) => request(`/rota/week?date=${date}`)
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
