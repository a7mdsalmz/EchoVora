"use client";

import * as React from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const saved = (localStorage.getItem("echovora-theme") as Theme | null) ?? "dark";
    applyTheme(saved);
  }, []);

  return <>{children}</>;
}

export function toggleTheme() {
  const current = (document.documentElement.dataset.theme as Theme | undefined) ?? "dark";
  const next: Theme = current === "dark" ? "light" : "dark";
  localStorage.setItem("echovora-theme", next);
  applyTheme(next);
}

export function getTheme(): Theme {
  return ((document.documentElement.dataset.theme as Theme | undefined) ?? "dark") as Theme;
}

