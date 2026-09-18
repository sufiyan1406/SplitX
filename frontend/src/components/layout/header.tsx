import { ModeSwitcher } from "@/components/layout/mode-switcher";
import { RemainderClock } from "@/components/layout/remainder-clock";
import { WalletMenu } from "@/components/wallet/wallet-menu";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/assets", label: "Assets" },
  { to: "/sell", label: "Listing" },
  { to: "/how-it-works", label: "Protocol" },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/92">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link
          to="/"
          className="font-display text-[1.55rem] leading-none text-fg"
          onClick={() => setOpen(false)}
        >
          Split<span className="text-hot">X</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const on = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "nav-link text-[0.78rem] tracking-wide transition-colors duration-200",
                  on ? "nav-link-active text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ModeSwitcher className="hidden sm:inline-flex" />
          <RemainderClock className="hidden items-center xl:flex" />
          <Link to="/provider" className="meta hidden text-faint transition-colors hover:text-fg xl:inline">
            Provider
          </Link>
          <WalletMenu />
          <button
            type="button"
            className="pill px-3 py-2 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-bg px-5 py-4 lg:hidden">
          <div className="mb-3 flex items-center justify-between border-b border-line/60 pb-3">
            <span className="meta">Active Mode</span>
            <ModeSwitcher />
          </div>
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "pill w-full justify-between",
                  pathname === item.to && "pill-solid",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/provider" onClick={() => setOpen(false)} className="pill mt-2 w-full">
              Provider
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
