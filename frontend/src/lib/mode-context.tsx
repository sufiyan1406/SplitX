"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type AppMode = "browser" | "buyer";

type ModeContextType = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  isBrowser: boolean;
  isBuyer: boolean;
};

const MODE_STORAGE_KEY = "splitx-active-mode-v3";

const ModeContext = createContext<ModeContextType | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(MODE_STORAGE_KEY) as AppMode | null;
      if (saved === "browser" || saved === "buyer") return saved;
    }
    return "browser"; // Default to browser mode
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
    }
  };

  const toggleMode = () => {
    setMode(mode === "browser" ? "buyer" : "browser");
  };

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isBrowser: mode === "browser",
        isBuyer: mode === "buyer",
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useAppMode must be used within a ModeProvider");
  }
  return ctx;
}
