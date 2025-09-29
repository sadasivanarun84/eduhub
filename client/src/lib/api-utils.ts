// Get API base URL from environment, fallback to relative URLs for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function getApiUrl(path: string): string {
  return path.startsWith('/') ? `${API_BASE_URL}${path}` : path;
}

export async function apiPost(url: string, data: any, options: RequestInit = {}) {
  const response = await fetch(getApiUrl(url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });
  return response;
}

export async function apiGet(url: string, options: RequestInit = {}) {
  const response = await fetch(getApiUrl(url), {
    method: 'GET',
    ...options,
  });
  return response;
}

export async function apiDelete(url: string, options: RequestInit = {}) {
  const response = await fetch(getApiUrl(url), {
    method: 'DELETE',
    ...options,
  });
  return response;
}