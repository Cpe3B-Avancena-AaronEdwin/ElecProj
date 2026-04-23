import {
  setAuthCurrentUser,
  clearAuthCurrentUser,
} from "./config";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function parseResponse(response, fallbackMessage) {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return data;
}

async function apiFetch(path, fallbackMessage, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  return parseResponse(response, fallbackMessage);
}

function syncCurrentUser(user) {
  if (user) {
    return setAuthCurrentUser(user);
  }

  clearAuthCurrentUser();
  return null;
}

export async function loginUser(identifier, password) {
  const data = await apiFetch("/api/auth/login", "Login failed.", {
    method: "POST",
    body: JSON.stringify({
      identifier,
      password,
    }),
  });

  syncCurrentUser(data?.user || null);
  return data;
}

export async function registerUser(fullName, username, email, password) {
  const data = await apiFetch("/api/auth/register", "Sign up failed.", {
    method: "POST",
    body: JSON.stringify({
      fullName,
      username,
      email,
      password,
    }),
  });

  syncCurrentUser(data?.user || null);
  return data;
}

export function signInWithGoogle() {
  window.location.assign(`${API_BASE}/api/auth/google`);
}

export async function getCurrentUser() {
  try {
    const data = await apiFetch("/api/auth/me", "Failed to load current user.");
    return syncCurrentUser(data?.user || null);
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unauthorized")) {
      clearAuthCurrentUser();
      return null;
    }

    throw error;
  }
}

export async function logoutUser() {
  try {
    await apiFetch("/api/auth/logout", "Logout failed.", {
      method: "POST",
    });
  } finally {
    clearAuthCurrentUser();
    window.location.assign("/login");
  }
}

export async function getCurrentUserProviders() {
  const data = await apiFetch(
    "/api/auth/providers",
    "Failed to load login providers."
  );

  return Array.isArray(data?.providers) ? data.providers : [];
}

export function linkGoogleToCurrentUser() {
  window.location.assign(`${API_BASE}/api/auth/google?mode=link`);
}

export async function linkPasswordToCurrentUser(email, password) {
  const data = await apiFetch(
    "/api/auth/link/password",
    "Failed to add password login.",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  syncCurrentUser(data?.user || null);
  return data;
}