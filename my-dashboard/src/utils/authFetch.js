export async function getAuthHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
  };
}

export async function authFetch(url, options = {}) {
  const headers = await getAuthHeaders(options.headers || {});

  return fetch(url, {
    ...options,
    credentials: "include",
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