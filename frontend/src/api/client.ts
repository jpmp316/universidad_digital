import axios, { AxiosError } from "axios";

import type { ApiError } from "./types";

const csrfCookieName = "csrf_token";

function readCookie(name: string): string | null {
  const cookies = document.cookie.split("; ");
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiError | undefined;
    if (typeof payload?.detail === "string") return payload.detail;
    if (Array.isArray(payload?.detail)) return payload.detail.map((item) => item.msg ?? "Dato inválido").join(". ");
    if (!error.response) return "No se pudo conectar con el servidor.";
  }
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = readCookie(csrfCookieName);
    if (csrfToken) config.headers.set("X-CSRF-Token", csrfToken);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const publicAuthPaths = ["/auth/me", "/auth/login", "/auth/register"];
    const isPublicAuthRequest = publicAuthPaths.some((path) => error.config?.url?.endsWith(path));
    if (error.response?.status === 401 && !isPublicAuthRequest) {
      window.dispatchEvent(new Event("university:session-expired"));
    }
    return Promise.reject(error);
  },
);