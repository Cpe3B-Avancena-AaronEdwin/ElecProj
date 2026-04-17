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
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            setUser({
              ...firebaseUser,
              displayName:
                userData.displayName ||
                firebaseUser.displayName ||
                "",
              fullName:
                userData.displayName ||
                firebaseUser.displayName ||
                "",
              username: userData.username || "",
              photoURL: userData.photoURL || firebaseUser.photoURL || "",
              email: userData.email || firebaseUser.email || "",
            });

            setRole(userData.role || "viewer");
          } else {
            setUser(firebaseUser);
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

  const updateProfileInfo = async (data) => {
    await updateUserProfile(data);

    setUser((prev) => ({
      ...prev,
      displayName: data.displayName || prev?.displayName || "",
      fullName: data.displayName || prev?.fullName || "",
      photoURL: data.photoURL || prev?.photoURL || "",
    }));
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