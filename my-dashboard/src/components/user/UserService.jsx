import { auth } from "../../firebase/config";
import { authFetch } from "../../utils/authFetch";

const API_BASE = import.meta.env.DEV
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
  : "";

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

async function handleResponse(response, fallbackMessage) {
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

export const updateUserProfile = async ({
  userId,
  displayName,
  email,
  role,
  photoURL,
  username,
  fullName,
}) => {
  const currentUser = auth.currentUser;
  const targetUserId = userId || currentUser?.uid;

  if (!targetUserId) {
    throw new Error("No user ID available for profile update.");
  }

  const response = await authFetch(buildApiUrl(`/api/users/${targetUserId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName,
      email,
      role,
      photoURL,
      username,
      fullName,
    }),
  });

  const data = await handleResponse(response, "Failed to update user profile.");
  return { success: true, data };
};

export const updatePassword = async (newPassword, currentPassword = "") => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const response = await authFetch(buildApiUrl("/api/auth/password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const data = await handleResponse(response, "Failed to update password.");
  return { success: true, data };
};

export const getUserSessions = async (userId) => {
  return {
    Device: "Current browser session",
    Location: "Tracked by backend auth cookie",
    "IP Address": "Hidden",
    "Last Active": "Just now",
    userId: userId || auth.currentUser?.uid || "",
  };
};

export const deleteUserAccount = async (userId) => {
  const currentUser = auth.currentUser;
  const targetUserId = userId || currentUser?.uid;

  if (!targetUserId) {
    throw new Error("No authenticated user.");
  }

  const response = await authFetch(buildApiUrl(`/api/users/${targetUserId}`), {
    method: "DELETE",
  });

  const data = await handleResponse(response, "Failed to delete user.");
  return { success: true, data };
};