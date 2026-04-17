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
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./config";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

const getSafeNameFromEmail = (email = "") => {
  return email.split("@")[0] || "User";
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    sessions: overrides.sessions || [],
  };
};

const ensureUserDocument = async (user, overrides = {}) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, buildUserDoc(user, overrides));
  } else {
    const existing = userSnap.data();

    await updateDoc(userRef, {
      email: user.email || existing.email || "",
      displayName:
        overrides.displayName ||
        overrides.fullName ||
        existing.displayName ||
        user.displayName ||
        getSafeNameFromEmail(user.email),
      fullName:
        overrides.fullName ||
        overrides.displayName ||
        existing.fullName ||
        user.displayName ||
        getSafeNameFromEmail(user.email),
      username:
        overrides.username !== undefined
          ? overrides.username
          : (existing.username || ""),
      photoURL:
        overrides.photoURL !== undefined
          ? overrides.photoURL
          : (user.photoURL || existing.photoURL || ""),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  }

  return userRef;
};

// Email/Password Login
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  await ensureUserDocument(userCredential.user);
  return userCredential;
};

// Email/Password Register
export const registerUser = async (fullName, email, password) => {
  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();

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
    username: "",
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
            "This email already has a password account. Log in using email and password first, then go to Profile and use Link Google."
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
      throw new Error(
        "That email is already being used by another account."
      );
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

  await updateProfile(user, {
    displayName: resolvedName,
    photoURL: data.photoURL || "",
  });

  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    displayName: resolvedName,
    fullName: resolvedName,
    username: data.username || "",
    photoURL: data.photoURL || "",
    updatedAt: serverTimestamp(),
  });
};

// Update Password
export const updateUserPassword = async (newPassword) => {
  const user = auth.currentUser;
  if (!user) return;
  await fbUpdatePassword(user, newPassword);
};

// Get User Sessions
export const getUserSessions = async () => {
  const user = auth.currentUser;
  if (!user) return [];

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data().sessions || [];
  }

  return [];
};

// Delete Account + History
export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) return;

  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
};