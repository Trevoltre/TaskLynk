"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "professional" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "theme";
const THEME_CLASSES: Theme[] = ["dark", "professional"];

function applyThemeClass(next: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Remove known theme classes first
  THEME_CLASSES.forEach((cls) => root.classList.remove(cls));

  // professional uses :root variables, no class needed
  if (next === "professional") {
    return;
  }

  // Add the selected theme class (dark)
  root.classList.add(next);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
    return stored || "dark";
  });

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    _setTheme(t);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, t);
    }
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback for environments/pages not wrapped by ThemeProvider (e.g., global-error)
    const stored = (typeof window !== "undefined" ? (window.localStorage.getItem(THEME_KEY) as Theme | null) : null) || "dark";
    return {
      theme: stored,
      setTheme: (t: Theme) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(THEME_KEY, t);
          applyThemeClass(t);
        }
      },
    } as ThemeContextValue;
  }
  return ctx;
}