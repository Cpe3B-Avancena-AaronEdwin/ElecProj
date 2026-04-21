// src/components/user/UserService.jsx
import { auth, db } from "../../firebase/config";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  deleteUser,
} from "firebase/auth";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

/**
 * Update a user's profile in Firestore.
 *
 * Usage:
 * 1) Current logged-in user editing own profile:
 *    updateUserProfile({ displayName, photoURL })
 *
 * 2) Admin editing another user, including role:
 *    updateUserProfile({ userId, displayName, email, role, photoURL })
 */
export const updateUserProfile = async ({
  userId,
  displayName,
  email,
  role,
  photoURL,
}) => {
  const currentUser = auth.currentUser;
  const targetUserId = userId || currentUser?.uid;

  if (!targetUserId) {
    throw new Error("No user ID available for profile update.");
  }

  const userRef = doc(db, "users", targetUserId);
  const existingSnap = await getDoc(userRef);

  if (!existingSnap.exists()) {
    throw new Error("User document not found.");
  }

  const existingData = existingSnap.data();

  const payload = {
    ...existingData,
    updatedAt: serverTimestamp(),
  };

  if (displayName !== undefined) payload.displayName = displayName;
  if (photoURL !== undefined) payload.photoURL = photoURL;
  if (email !== undefined) payload.email = email;
  if (role !== undefined) payload.role = role;

  await updateDoc(userRef, payload);

  // Only update Firebase Auth profile if the logged-in user is updating self
  if (currentUser && targetUserId === currentUser.uid) {
    const authProfileUpdates = {};
    if (displayName !== undefined) authProfileUpdates.displayName = displayName;
    if (photoURL !== undefined) authProfileUpdates.photoURL = photoURL;

    if (Object.keys(authProfileUpdates).length > 0) {
      await firebaseUpdateProfile(currentUser, authProfileUpdates);
    }
  }

  return {
    success: true,
    data: payload,
  };
};

/**
 * Change current logged-in user's password.
 * If currentPassword is provided, it will re-authenticate first.
 */
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

/**
 * Mock-ish session info placeholder.
 * Keep this until you build real session tracking.
 */
export const getUserSessions = async (userId) => {
  return {
    Device: "Chrome on Windows",
    Location: "Philippines",
    "IP Address": "192.168.1.1",
    "Last Active": "Just now",
    userId: userId || auth.currentUser?.uid || "",
  };
};

/**
 * Delete account behavior:
 * - If userId is passed and it is NOT the current logged-in user:
 *   only delete the Firestore user document (admin use case).
 * - If no userId is passed, or it matches current user:
 *   delete Firestore doc + Firebase Auth account for the current user.
 */
export const deleteUserAccount = async (userId) => {
  const currentUser = auth.currentUser;

  if (userId && currentUser && userId !== currentUser.uid) {
    await deleteDoc(doc(db, "users", userId));
    return { success: true, mode: "firestore-only" };
  }

  if (!currentUser) {
    throw new Error("No authenticated user.");
  }

  await deleteDoc(doc(db, "users", currentUser.uid));
  await deleteUser(currentUser);

  return { success: true, mode: "self-delete" };
};