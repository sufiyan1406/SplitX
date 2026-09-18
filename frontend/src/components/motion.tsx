import { cn } from "@/lib/utils";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

/* ── Scroll‑triggered fade‑up reveal ──────────────────────────────────────── */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) { setOn(true); io.disconnect(); }
      },
      { threshold: 0.05, rootMargin: "0px 0px -4% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", on && "reveal-on", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Magnetic — DISABLED (kept as passthrough so imports don't break) ────── */
export function Magnetic({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/* ── Scroll‑triggered image clip‑path reveal ──────────────────────────────── */
export function ImageReveal({
  children,
  className,
  direction = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Use threshold 0 so it fires as soon as any part enters viewport
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) { setOn(true); io.disconnect(); }
      },
      { threshold: 0, rootMargin: "50px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const dirClass =
    direction === "left"
      ? "img-reveal-left"
      : direction === "right"
        ? "img-reveal-right"
        : "img-reveal-up";

  return (
    <div
      ref={ref}
      className={cn("img-reveal", dirClass, on && "img-reveal-on", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Per‑letter hero text animation ───────────────────────────────────────── */
export function HeroWord({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("font-display leading-none", className)} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="hero-letter"
          style={{ animationDelay: `${i * 55}ms` } as CSSProperties}
        >
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </span>
  );
}

/* ── Animated counter (for "X live listings") ─────────────────────────────── */
export function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value <= 0) { setDisplay(0); return; }
    const duration = 1200;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{display}</span>;
}

/* ── TextReveal: Staggered word-by-word reveal on scroll / mount ───────────── */
export function TextReveal({
  text,
  className,
  as: Component = "h2",
  delay = 0,
  stagger = 40,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -4% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <Component ref={ref as any} className={cn("overflow-visible", className)}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-top mr-[0.25em] last:mr-0"
        >
          <span
            className="inline-block transition-all duration-700 ease-out will-change-transform"
            style={{
              transform: inView ? "translateY(0)" : "translateY(115%)",
              opacity: inView ? 1 : 0,
              filter: inView ? "blur(0px)" : "blur(4px)",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: `${delay + i * stagger}ms`,
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </Component>
  );
}

/* ── Custom cursor ────────────────────────────────────────────────────────── */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    document.body.style.cursor = "none";
    const onMove = (e: PointerEvent) => {
      if (dot.current) {
        dot.current.style.left = `${e.clientX}px`;
        dot.current.style.top = `${e.clientY}px`;
      }
      if (ring.current) {
        ring.current.style.left = `${e.clientX}px`;
        ring.current.style.top = `${e.clientY}px`;
      }
    };
    const onOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const hot = Boolean(t?.closest("a,button,[data-cursor='hot']"));
      ring.current?.classList.toggle("hot", hot);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerover", onOver);
    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
    };
  }, []);

  return (
    <>
      <div ref={dot} className="cursor-dot hidden md:block" />
      <div ref={ring} className="cursor-ring hidden md:block" />
    </>
  );
}
