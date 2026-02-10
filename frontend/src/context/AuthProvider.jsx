import { useState } from "react";
import AuthContext from "./authContext";
import api from "../services/api";

export default function AuthProvider({ children }) {
  // Load user from localStorage once (ESLint-safe)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("user", JSON.stringify(res.data));
    setUser(res.data);
  };

  const signup = async (username, email, password) => {
    const res = await api.post("/auth/signup", {
      username,
      email,
      password,
    });
    localStorage.setItem("user", JSON.stringify(res.data));
    setUser(res.data);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
