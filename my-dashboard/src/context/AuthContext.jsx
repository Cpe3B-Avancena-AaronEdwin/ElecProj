import { createContext, useContext, useEffect, useState } from "react";
import { observeAuthState } from "../firebase/auth";

import {
  updateUserProfile,
  updatePassword,
  getUserSessions,
  deleteUserAccount,
} from "../components/user/UserService";
import { authJsonFetch } from "../utils/authFetch";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData = await authJsonFetch(
            `${API_BASE}/api/users/${firebaseUser.uid}`,
            "Failed to load user profile."
          );

          setUser({
            ...firebaseUser,
            displayName:
              userData.displayName || firebaseUser.displayName || "",
            fullName:
              userData.fullName ||
              userData.displayName ||
              firebaseUser.displayName ||
              "",
            username: userData.username || "",
            photoURL: userData.photoURL || firebaseUser.photoURL || "",
            email: userData.email || firebaseUser.email || "",
          });

          setRole(userData.role || "viewer");
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Auth context error:", error);

        if (firebaseUser) {
          setUser(firebaseUser);
          setRole("viewer");
        } else {
          setUser(null);
          setRole(null);
        }
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
      displayName:
        data.displayName !== undefined
          ? data.displayName
          : prev?.displayName || "",
      fullName:
        data.fullName !== undefined
          ? data.fullName
          : data.displayName !== undefined
          ? data.displayName
          : prev?.fullName || "",
      username:
        data.username !== undefined
          ? data.username
          : prev?.username || "",
      photoURL:
        data.photoURL !== undefined
          ? data.photoURL
          : prev?.photoURL || "",
      email:
        data.email !== undefined
          ? data.email
          : prev?.email || "",
    }));
  };

  const changePassword = async (newPassword, currentPassword = "") => {
    await updatePassword(newPassword, currentPassword);
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
        removeAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}