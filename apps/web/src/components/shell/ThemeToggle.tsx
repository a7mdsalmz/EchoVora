"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getTheme, toggleTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    setTheme(getTheme());
  }, []);

  const Icon = theme === "dark" ? Moon : Sun;

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        toggleTheme();
        setTheme(getTheme());
      }}
      aria-label="Toggle theme"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

