import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword as fbUpdatePassword,
  deleteUser,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import { auth } from "./config";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

const getSafeNameFromEmail = (email = "") => {
  return email.split("@")[0] || "User";
};

const normalizeUsername = (username = "") => {
  return username.trim().toLowerCase();
};

const isEmailInput = (value = "") => {
  return value.includes("@");
};

async function apiFetch(url, fallbackMessage, options) {
  const response = await fetch(url, options);

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

const getUserByUsername = async (username) => {
  const normalized = normalizeUsername(username);

  if (!normalized) return null;

  try {
    return await apiFetch(
      `${API_BASE}/api/users/lookup/by-username/${encodeURIComponent(normalized)}`,
      "Username not found."
    );
  } catch {
    return null;
  }
};

const resolveEmailForLogin = async (identifier) => {
  const trimmed = identifier.trim();

  if (!trimmed) {
    throw new Error("Email or username is required.");
  }

  if (isEmailInput(trimmed)) {
    return trimmed;
  }

  const matchedUser = await getUserByUsername(trimmed);

  if (!matchedUser?.email) {
    throw new Error("Username not found.");
  }

  return matchedUser.email;
};

const isUsernameTaken = async (username) => {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;

  const existingUser = await getUserByUsername(normalized);
  return !!existingUser;
};

const buildUserDoc = (user, overrides = {}) => {
  const resolvedName =
    overrides.displayName ||
    overrides.fullName ||
    user.displayName ||
    getSafeNameFromEmail(user.email);

  return {
    uid: user.uid,
    email: user.email || "",
    displayName: resolvedName,
    fullName: overrides.fullName || resolvedName,
    username: overrides.username || "",
    photoURL: overrides.photoURL ?? user.photoURL ?? "",
    role: overrides.role || "viewer",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    sessions: overrides.sessions || [],
  };
};

const ensureUserDocument = async (user, overrides = {}) => {
  const payload = buildUserDoc(user, overrides);

  const result = await apiFetch(
    `${API_BASE}/api/users/upsert/${user.uid}`,
    "Failed to sync user profile.",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  return result.user;
};

// Email/Password Login using email OR username
export const loginUser = async (identifier, password) => {
  const resolvedEmail = await resolveEmailForLogin(identifier);

  const userCredential = await signInWithEmailAndPassword(
    auth,
    resolvedEmail,
    password
  );

  await ensureUserDocument(userCredential.user);
  return userCredential;
};

// Email/Password Register
export const registerUser = async (fullName, username, email, password) => {
  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    throw new Error("Username is required.");
  }

  const usernameTaken = await isUsernameTaken(normalizedUsername);

  if (usernameTaken) {
    throw new Error("Username is already taken.");
  }

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    trimmedEmail,
    password
  );

  const user = userCredential.user;

  await updateProfile(user, {
    displayName: trimmedName,
  });

  await ensureUserDocument(user, {
    displayName: trimmedName,
    fullName: trimmedName,
    username: normalizedUsername,
    photoURL: "",
    role: "viewer",
    sessions: [],
  });

  return userCredential;
};

// Google Login / Google Signup
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    await ensureUserDocument(user, {
      displayName: user.displayName || getSafeNameFromEmail(user.email),
      fullName: user.displayName || getSafeNameFromEmail(user.email),
      photoURL: user.photoURL || "",
      role: "viewer",
      sessions: [],
    });

    return result;
  } catch (error) {
    if (error.code === "auth/account-exists-with-different-credential") {
      const email = error.customData?.email;

      if (email) {
        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.includes("password")) {
          throw new Error(
            "This email already has a password account. Log in using email/username and password first, then go to Profile and use Link Google."
          );
        }

        if (methods.includes("google.com")) {
          throw new Error("Google sign-in already exists for this account.");
        }
      }
    }

    throw error;
  }
};

// Link Google to current password account
export const linkGoogleToCurrentUser = async () => {
  if (!auth.currentUser) {
    throw new Error("No signed-in user to link.");
  }

  try {
    const result = await linkWithPopup(auth.currentUser, googleProvider);

    await auth.currentUser.reload();

    await ensureUserDocument(auth.currentUser, {
      displayName:
        auth.currentUser.displayName ||
        getSafeNameFromEmail(auth.currentUser.email),
      fullName:
        auth.currentUser.displayName ||
        getSafeNameFromEmail(auth.currentUser.email),
      photoURL: auth.currentUser.photoURL || "",
    });

    return result;
  } catch (error) {
    if (error.code === "auth/provider-already-linked") {
      throw new Error("Google is already linked to this account.");
    }

    if (error.code === "auth/credential-already-in-use") {
      throw new Error(
        "This Google account is already linked to another Firebase account."
      );
    }

    throw error;
  }
};

// Add password to current Google account
export const linkPasswordToCurrentUser = async (email, password) => {
  if (!auth.currentUser) {
    throw new Error("No signed-in user to link.");
  }

  if (!email.trim()) {
    throw new Error("Email is required.");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  try {
    const credential = EmailAuthProvider.credential(email.trim(), password);
    const result = await linkWithCredential(auth.currentUser, credential);

    await ensureUserDocument(auth.currentUser, {
      email: email.trim(),
    });

    return result;
  } catch (error) {
    if (error.code === "auth/provider-already-linked") {
      throw new Error("Password login is already linked to this account.");
    }

    if (error.code === "auth/email-already-in-use") {
      throw new Error("That email is already being used by another account.");
    }

    if (error.code === "auth/invalid-email") {
      throw new Error("Invalid email address.");
    }

    if (error.code === "auth/weak-password") {
      throw new Error("Password must be at least 6 characters.");
    }

    throw error;
  }
};

// Logout
export const logoutUser = async () => {
  await signOut(auth);
};

// Observe Auth State
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Update Profile
export const updateUserProfile = async (data) => {
  const user = auth.currentUser;
  if (!user) return;

  const resolvedName = data.fullName || data.displayName || "";
  const normalizedUsername =
    data.username !== undefined ? normalizeUsername(data.username) : "";

  if (normalizedUsername) {
    const existing = await getUserByUsername(normalizedUsername);
    if (existing && existing.uid !== user.uid && existing.id !== user.uid) {
      throw new Error("Username is already taken.");
    }
  }

  await updateProfile(user, {
    displayName: resolvedName,
    photoURL: data.photoURL || "",
  });

  await apiFetch(
    `${API_BASE}/api/users/${user.uid}`,
    "Failed to update profile.",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: resolvedName,
        fullName: resolvedName,
        username: normalizedUsername,
        photoURL: data.photoURL || "",
      }),
    }
  );
};

// Update Password with reauthentication
export const updateUserPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user is signed in.");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await fbUpdatePassword(user, newPassword);
};

// Get User Sessions
export const getUserSessions = async () => {
  const user = auth.currentUser;
  if (!user) return [];

  const profile = await apiFetch(
    `${API_BASE}/api/users/${user.uid}`,
    "Failed to load sessions."
  );

  return profile.sessions || [];
};

// Delete Account + History
export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) return;

  await apiFetch(`${API_BASE}/api/users/${user.uid}`, "Failed to delete user.", {
    method: "DELETE",
  });

  await deleteUser(user);
};