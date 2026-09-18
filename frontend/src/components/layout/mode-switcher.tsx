"use client";

import { useAppMode } from "@/lib/mode-context";
import { cn } from "@/lib/utils";
import { Globe, ShoppingCart } from "lucide-react";

export function ModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useAppMode();

  return (
    <div
      className={cn(
        "inline-flex items-center border border-line bg-surface/90 p-0.5 shadow-[var(--shadow-border)]",
        className,
      )}
      role="group"
      aria-label="Account Mode Switcher"
    >
      <button
        type="button"
        onClick={() => setMode("browser")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-all",
          mode === "browser"
            ? "bg-hot text-white font-bold shadow-sm"
            : "text-muted hover:text-fg hover:bg-white/5",
        )}
        title="Browser Mode: Explore SplitX marketplace and listings freely"
      >
        <Globe className="size-3" />
        <span>Browser</span>
      </button>

      <button
        type="button"
        onClick={() => setMode("buyer")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-all",
          mode === "buyer"
            ? "bg-hot text-white font-bold shadow-sm"
            : "text-muted hover:text-fg hover:bg-white/5",
        )}
        title="Buyer Mode: Purchase subscription time and listed assets"
      >
        <ShoppingCart className="size-3" />
        <span>Buyer</span>
      </button>
    </div>
  );
}
