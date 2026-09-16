import { cn } from "@/lib/utils";
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

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
        if (e?.isIntersecting) setOn(true);
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
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

export function Magnetic({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
  }

  function leave() {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      className={cn("will-change-transform transition-transform duration-200 ease-out", className)}
    >
      {children}
    </div>
  );
}

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
