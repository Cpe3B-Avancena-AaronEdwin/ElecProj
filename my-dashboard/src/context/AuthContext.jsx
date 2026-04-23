import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../firebase/auth";
import {
  setAuthCurrentUser,
  clearAuthCurrentUser,
} from "../firebase/config";
import {
  updateUserProfile,
  updatePassword,
  getUserSessions,
  deleteUserAccount,
} from "../components/user/UserService";

const AuthContext = createContext(null);

function normalizeAuthUser(authUser) {
  if (!authUser) return null;

  return {
    ...authUser,
    uid: authUser.uid || "",
    displayName: authUser.displayName || authUser.fullName || "",
    fullName: authUser.fullName || authUser.displayName || "",
    username: authUser.username || "",
    photoURL: authUser.photoURL || "",
    email: authUser.email || "",
    role: authUser.role || "viewer",
    providerData: Array.isArray(authUser.providerData)
      ? authUser.providerData
      : [],
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadAuthenticatedUser = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (!isActive) return;

        const normalizedUser = normalizeAuthUser(currentUser);

        if (normalizedUser) {
          setUser(normalizedUser);
          setRole(normalizedUser.role || "viewer");
          setAuthCurrentUser(normalizedUser);
        } else {
          setUser(null);
          setRole(null);
          clearAuthCurrentUser();
        }
      } catch (error) {
        console.error("Auth context error:", error);

        if (!isActive) return;

        setUser(null);
        setRole(null);
        clearAuthCurrentUser();
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadAuthenticatedUser();

    return () => {
      isActive = false;
    };
  }, []);

  const syncUserState = (updater) => {
    setUser((previousUser) => {
      const nextUser =
        typeof updater === "function" ? updater(previousUser) : updater;

      const normalizedUser = normalizeAuthUser(nextUser);

      if (normalizedUser) {
        setAuthCurrentUser(normalizedUser);
        setRole(normalizedUser.role || "viewer");
      } else {
        clearAuthCurrentUser();
        setRole(null);
      }

      return normalizedUser;
    });
  };

  const refreshUser = async () => {
    const currentUser = await getCurrentUser();
    const normalizedUser = normalizeAuthUser(currentUser);

    syncUserState(normalizedUser);
    return normalizedUser;
  };

  const updateProfileInfo = async (data) => {
    await updateUserProfile(data);

    syncUserState((previousUser) => ({
      ...(previousUser || {}),
      displayName:
        data.displayName !== undefined
          ? data.displayName
          : previousUser?.displayName || "",
      fullName:
        data.fullName !== undefined
          ? data.fullName
          : data.displayName !== undefined
          ? data.displayName
          : previousUser?.fullName || "",
      username:
        data.username !== undefined
          ? data.username
          : previousUser?.username || "",
      photoURL:
        data.photoURL !== undefined
          ? data.photoURL
          : previousUser?.photoURL || "",
      email:
        data.email !== undefined
          ? data.email
          : previousUser?.email || "",
    }));
  };

  const changePassword = async (newPassword, currentPassword = "") => {
    await updatePassword(newPassword, currentPassword);
  };

  const fetchSessions = async () => {
    return getUserSessions();
  };

  const removeAccount = async () => {
    await deleteUserAccount();
    syncUserState(null);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      refreshUser,
      updateProfileInfo,
      changePassword,
      fetchSessions,
      removeAccount,
    }),
    [user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}