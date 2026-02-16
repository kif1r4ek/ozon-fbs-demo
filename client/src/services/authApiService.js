const API_BASE_URL = "/api/auth";

export async function login(loginValue, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login: loginValue, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Ошибка входа");
  }
  return data;
}

export async function logout() {
  await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchCurrentUser() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE_URL}/me`, {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}
