import { auth } from "../../firebase/config";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  deleteUser,
} from "firebase/auth";
import { authFetch } from "../../utils/authFetch";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

  const response = await authFetch(`${API_BASE}/api/users/${targetUserId}`, {
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

  await handleResponse(response, "Failed to update user profile.");

  if (currentUser && targetUserId === currentUser.uid) {
    const authProfileUpdates = {};
    if (displayName !== undefined) authProfileUpdates.displayName = displayName;
    if (photoURL !== undefined) authProfileUpdates.photoURL = photoURL;

    if (Object.keys(authProfileUpdates).length > 0) {
      await firebaseUpdateProfile(currentUser, authProfileUpdates);
    }
  }

  return { success: true };
};

export const updatePassword = async (newPassword, currentPassword = "") => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user.");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  if (currentPassword && currentUser.email) {
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(currentUser, credential);
  }

  await firebaseUpdatePassword(currentUser, newPassword);
  return { success: true };
};

export const getUserSessions = async (userId) => {
  return {
    Device: "Chrome on Windows",
    Location: "Philippines",
    "IP Address": "192.168.1.1",
    "Last Active": "Just now",
    userId: userId || auth.currentUser?.uid || "",
  };
};

export const deleteUserAccount = async (userId) => {
  const currentUser = auth.currentUser;

  if (userId && currentUser && userId !== currentUser.uid) {
    const response = await authFetch(`${API_BASE}/api/users/${userId}`, {
      method: "DELETE",
    });

    await handleResponse(response, "Failed to delete user.");
    return { success: true, mode: "backend-delete" };
  }

  if (!currentUser) {
    throw new Error("No authenticated user.");
  }

  const response = await authFetch(`${API_BASE}/api/users/${currentUser.uid}`, {
    method: "DELETE",
  });

  await handleResponse(response, "Failed to delete user profile.");
  await deleteUser(currentUser);

  return { success: true, mode: "self-delete" };
};