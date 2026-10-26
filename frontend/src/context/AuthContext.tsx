import { useEffect, useState, type ReactNode } from "react";

import { authApi } from "../api/endpoints";
import type { User } from "../api/types";
import { getApiErrorMessage, storeCsrfToken } from "../api/client";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const response = await authApi.me();
        storeCsrfToken(response.headers["x-csrf-token"] ?? null);
        if (mounted) setUser(response.data);
      } catch {
        storeCsrfToken(null);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    const expireSession = () => {
      if (mounted) {
        storeCsrfToken(null);
        setUser(null);
        setError("Tu sesión expiró. Vuelve a iniciar sesión.");
      }
    };
    window.addEventListener("university:session-expired", expireSession);
    void restoreSession();
    return () => {
      mounted = false;
      window.removeEventListener("university:session-expired", expireSession);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      storeCsrfToken(response.headers["x-csrf-token"] ?? null);
      setUser(response.data);
      return response.data;
    } catch (requestError) {
      storeCsrfToken(null);
      const message = getApiErrorMessage(requestError);
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (email: string, fullName: string, password: string) => {
    setError(null);
    try {
      const response = await authApi.register({ email, full_name: fullName, password });
      return response.data;
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      storeCsrfToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, clearError: () => setError(null) }}>
      {children}
    </AuthContext.Provider>
  );
}
