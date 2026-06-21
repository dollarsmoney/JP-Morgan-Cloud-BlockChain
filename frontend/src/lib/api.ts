import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { authBridge } from './auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true, // send/receive the refresh httpOnly cookie
  headers: { 'Content-Type': 'application/json' },
});

// Attach the in-memory access token to every request.
api.interceptors.request.use((config) => {
  const token = authBridge.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, attempt a single silent refresh then replay the original request.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data.accessToken as string;
        authBridge.set(token);
        return token;
      })
      .catch(() => {
        authBridge.clear();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown): string {
  const e = err as AxiosError<{ error?: { message?: string } }>;
  return e.response?.data?.error?.message || e.message || 'Something went wrong';
}
