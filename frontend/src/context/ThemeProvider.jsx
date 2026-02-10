import { createContext, useEffect, useMemo, useState } from "react";

export const ThemeContext = createContext(null);

const STORAGE_KEY = "theme"; // "dark" | "light"

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark"; // default dark
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const value = useMemo(() => {
    const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
    return { theme, setTheme, toggleTheme };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
