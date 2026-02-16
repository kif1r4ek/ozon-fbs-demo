const API_BASE = "/api";

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Ошибка: ${response.status}`);
  }
  return data;
}

// Users
export function fetchUsers() {
  return request(`${API_BASE}/users`);
}

export function createUser(data) {
  return request(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateUser(id, data) {
  return request(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteUser(id) {
  return request(`${API_BASE}/users/${id}`, { method: "DELETE" });
}

// Deliveries
export function fetchDeliveries(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  return request(`${API_BASE}/deliveries?${query}`);
}

export function fetchDeliveryStats() {
  return request(`${API_BASE}/deliveries/stats`);
}

export function assignDelivery(id, userId) {
  return request(`${API_BASE}/deliveries/${id}/assign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

export function bulkAssignDeliveries(deliveryIds, userId) {
  return request(`${API_BASE}/deliveries/bulk-assign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deliveryIds, userId }),
  });
}

export function assignGroup(shipmentDate, assignments) {
  return request(`${API_BASE}/deliveries/assign-group`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipmentDate, assignments }),
  });
}

export function fetchGroupAssignments(shipmentDate) {
  return request(`${API_BASE}/deliveries/group-assignments?shipmentDate=${encodeURIComponent(shipmentDate)}`);
}

export function fetchAssignedDates() {
  return request(`${API_BASE}/deliveries/assigned-dates`);
}

export function fetchAssignedPostings(shipmentDate) {
  return request(`${API_BASE}/deliveries/assigned-postings?shipmentDate=${encodeURIComponent(shipmentDate)}`);
}

export function fetchMyAssignments() {
  return request(`${API_BASE}/deliveries/my-assignments`);
}

export function fetchMyGroups() {
  return request(`${API_BASE}/deliveries/my-groups`);
}


// Sync
export function triggerSync() {
  return request(`${API_BASE}/sync/trigger`, { method: "POST" });
}

export function fetchSyncStatus() {
  return request(`${API_BASE}/sync/status`);
}

// Audit
export function fetchAuditLogs(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, value);
  }
  return request(`${API_BASE}/audit?${query}`);
}
