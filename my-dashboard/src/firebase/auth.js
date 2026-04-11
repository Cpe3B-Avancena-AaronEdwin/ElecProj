import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword as fbUpdatePassword,
  deleteUser
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "./config";

// 🔹 Login
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  const user = userCredential.user;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      role: "viewer",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      sessions: []
    });
  } else {
    // Update last login timestamp
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp()
    });
  }

  return userCredential;
};

// 🔹 Logout
export const logoutUser = async () => {
  await signOut(auth);
};

// 🔹 Observe Auth State
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// 🔹 Update Profile Info
export const updateUserProfile = async (data) => {
  const user = auth.currentUser;
  if (!user) return;

  await updateProfile(user, {
    displayName: data.fullName,
    photoURL: data.photoURL
  });

  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    displayName: data.fullName,
    username: data.username,
    photoURL: data.photoURL,
    updatedAt: serverTimestamp()
  });
};

// 🔹 Update Password
export const updateUserPassword = async (newPassword) => {
  const user = auth.currentUser;
  if (!user) return;
  await fbUpdatePassword(user, newPassword);
};

// 🔹 Get User Sessions
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

// 🔹 Delete Account + History
export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) return;

  // Delete Firestore user doc
  await deleteDoc(doc(db, "users", user.uid));

  // Delete Firebase Auth user
  await deleteUser(user);
};