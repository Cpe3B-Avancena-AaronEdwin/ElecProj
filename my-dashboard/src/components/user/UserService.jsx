import { auth, db } from "../../firebase/config";
import {
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

// Update user profile (displayName, photoURL, etc.)
export async function updateUserProfile(updates) {
  if (!auth.currentUser) throw new Error("No user is signed in");
  await updateProfile(auth.currentUser, updates);
  const userRef = doc(db, "users", auth.currentUser.uid);
  await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
  return true;
}

// Update user password
export async function updatePassword(newPassword) {
  if (!auth.currentUser) throw new Error("No user is signed in");
  await fbUpdatePassword(auth.currentUser, newPassword);
  return true;
}

// Get user sessions (example: stored in Firestore under "sessions")
export async function getUserSessions(uid) {
  const sessionRef = doc(db, "sessions", uid);
  const snapshot = await getDoc(sessionRef);
  if (snapshot.exists()) {
    return snapshot.data();
  }
  return null;
}

// Delete user account
export async function deleteUserAccount() {
  if (!auth.currentUser) throw new Error("No user is signed in");
  const uid = auth.currentUser.uid;

  // Remove Firestore user document
  const userRef = doc(db, "users", uid);
  await deleteDoc(userRef);

  // Delete the Firebase Auth user
  await deleteUser(auth.currentUser);
  return true;
}