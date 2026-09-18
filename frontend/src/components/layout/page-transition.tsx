"use client";

import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Minimal page transition — a clean fade + subtle vertical shift.
 * On route change the content fades out slightly, then the new page
 * fades in. Keeps it elegant and non-distracting.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [phase, setPhase] = useState<"visible" | "exiting" | "entering">("visible");
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathRef = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (pathname === prevPathRef.current) {
      // Same path, just update children
      setDisplayChildren(children);
      return;
    }

    prevPathRef.current = pathname;

    // Start exit
    setPhase("exiting");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // After exit animation (200ms), swap children and start enter
    timeoutRef.current = setTimeout(() => {
      setDisplayChildren(children);
      setPhase("entering");

      // Request animation frame so DOM paints entering state before transitioning to visible
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("visible");
        });
      });
    }, 200);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, children]);

  return (
    <div
      className="page-transition"
      data-phase={phase}
    >
      {displayChildren}
    </div>
  );
}
