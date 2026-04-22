import { auth } from "../firebase/config";

export async function getAuthHeaders(extraHeaders = {}) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return {
      ...extraHeaders,
    };
  }

  const token = await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
}

export async function authFetch(url, options = {}) {
  const headers = await getAuthHeaders(options.headers || {});

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function authJsonFetch(url, fallbackMessage, options = {}) {
  const response = await authFetch(url, options);

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