import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as loginRequest,
  logout as logoutRequest,
  getStoredUser,
  fetchMe,
} from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token && !user) {
      fetchMe().then(setUser).catch(() => {});
    }
  }, []);

  async function login(email, password) {
    setLoading(true);
    try {
      const u = await loginRequest(email, password);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    logoutRequest();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      isStaff: user?.role === "TECNICO" || user?.role === "ADMIN",
      isClient: user?.role === "CLIENTE",
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
