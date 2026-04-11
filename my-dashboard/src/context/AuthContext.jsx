import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { observeAuthState } from "../firebase/auth";

import {
  updateUserProfile,
  updatePassword,
  getUserSessions,
  deleteUserAccount
} from "../components/user/UserService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setRole(userSnap.data().role || "viewer");
          } else {
            setRole("viewer");
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Auth context error:", error);
        setUser(firebaseUser || null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔹 New helper functions for User Settings
  const updateProfileInfo = async (data) => {
    await updateUserProfile(data);
    // Refresh local state with updated info
    setUser({ ...user, displayName: data.fullName, photoURL: data.photoURL });
  };

  const changePassword = async (newPassword) => {
    await updatePassword(newPassword);
  };

  const fetchSessions = async () => {
    return await getUserSessions();
  };

  const removeAccount = async () => {
    await deleteUserAccount();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        updateProfileInfo,
        changePassword,
        fetchSessions,
        removeAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}