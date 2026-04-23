function mapProviders(user) {
  const providers = Array.isArray(user?.authProviders)
    ? user.authProviders
    : [];

  return providers.map((providerId) => ({ providerId }));
}

function buildCurrentUser(user) {
  if (!user) return null;

  return {
    ...user,
    uid: user.uid || "",
    email: user.email || "",
    displayName: user.displayName || user.fullName || "",
    fullName: user.fullName || user.displayName || "",
    username: user.username || "",
    photoURL: user.photoURL || "",
    role: user.role || "viewer",
    providerData: mapProviders(user),
    async reload() {
      return auth.currentUser;
    },
  };
}

export const auth = {
  currentUser: null,
};

export function setAuthCurrentUser(user) {
  auth.currentUser = buildCurrentUser(user);
  return auth.currentUser;
}

export function clearAuthCurrentUser() {
  auth.currentUser = null;
}