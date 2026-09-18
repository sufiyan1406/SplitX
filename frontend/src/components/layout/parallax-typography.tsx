"use client";

import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Monumental Faint Background Typography with Typewriter Scramble
 *
 * 1. Strictly 2 words on screen:
 *    - One in Top-Left (top: 3vh, left: 2.5vw)
 *    - One in Bottom-Right (bottom: 4vh, right: 2.5vw)
 *    - Separated diagonally so they NEVER overlap.
 * 2. Flat coloring matching the main fonts (#f4e6e3 & #ef233c):
 *    - Selected letters within each word are highlighted in faint SplitX Red.
 *    - No neon, no strokes, no borders, no shadows, no cursor glow.
 * 3. Typewriter Scramble Animation:
 *    - Triggers automatically on page load and every route change.
 *    - Deciphers characters sequentially left-to-right using high-speed glyph cycling.
 *    - Also cycles periodically while remaining on the page.
 */

interface WordDef {
  word: string;
  redIndices: number[];
}

const WORDS_LEFT: WordDef[] = [
  { word: "KEEP", redIndices: [1] },     // K [E] E P
  { word: "SPLIT", redIndices: [2] },    // S P [L] I T
  { word: "LOCK", redIndices: [1] },     // L [O] C K
  { word: "STREAM", redIndices: [3] },   // S T R [E] A M
  { word: "DIVIDE", redIndices: [2] },   // D I [V] I D E
];

const WORDS_RIGHT: WordDef[] = [
  { word: "SELL", redIndices: [0] },     // [S] E L L
  { word: "TRADE", redIndices: [2] },    // T R [A] D E
  { word: "RESELL", redIndices: [2] },   // R E [S] E L L
  { word: "OWN", redIndices: [1] },      // O [W] N
  { word: "LIQUID", redIndices: [3] },   // L I Q [U] I D
];

const SCRAMBLE_CHARS = "SPLITX0123456789ABCDEFGHJKMNPQRSTUVWYZ/#";

function useTypewriterScramble(words: WordDef[], initialDelay: number = 0) {
  const [index, setIndex] = useState(0);
  const [displayLetters, setDisplayLetters] = useState<
    Array<{ char: string; isRed: boolean; isLocked: boolean }>
  >(() => {
    const init = words[0];
    return init.word.split("").map((c, i) => ({
      char: c,
      isRed: init.redIndices.includes(i),
      isLocked: true,
    }));
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  const startScramble = (targetDef: WordDef) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const targetWord = targetDef.word;
    const redIndices = targetDef.redIndices;
    const len = targetWord.length;

    let tick = 0;
    // Each letter locks in with a slight delay from left to right
    const ticksPerLetter = 4;
    const totalTicks = len * ticksPerLetter + 6;

    intervalRef.current = setInterval(() => {
      tick++;

      const updated = Array.from({ length: len }, (_, i) => {
        const lockTick = i * ticksPerLetter + 4;
        if (tick >= lockTick) {
          return {
            char: targetWord[i],
            isRed: redIndices.includes(i),
            isLocked: true,
          };
        } else {
          // Rapid typewriter scramble glyph
          const randomChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          return {
            char: randomChar,
            isRed: false,
            isLocked: false,
          };
        }
      });

      setDisplayLetters(updated);

      if (tick >= totalTicks) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 32);
  };

  const nextWord = () => {
    indexRef.current = (indexRef.current + 1) % words.length;
    setIndex(indexRef.current);
    startScramble(words[indexRef.current]);
  };

  // Trigger on route visit or manual call
  const triggerScramble = () => {
    nextWord();
  };

  return {
    displayLetters,
    triggerScramble,
    nextWord,
  };
}

export function ParallaxTypography() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathRef = useRef(pathname);
  const isFirstMount = useRef(true);

  const leftScramble = useTypewriterScramble(WORDS_LEFT, 100);
  const rightScramble = useTypewriterScramble(WORDS_RIGHT, 350);

  const leftSlotRef = useRef<HTMLDivElement>(null);
  const rightSlotRef = useRef<HTMLDivElement>(null);

  // Parallax Scroll Tracking
  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number;

    const onScroll = () => {
      const lenis = (window as unknown as { __lenis?: { scroll: number } }).__lenis;
      const scrollY = lenis ? lenis.scroll : window.scrollY;

      // Subtle parallax offset: Top-Left moves gently, Bottom-Right moves slightly faster
      if (leftSlotRef.current) {
        leftSlotRef.current.style.transform = `translate3d(0, ${-scrollY * 0.08}px, 0)`;
      }
      if (rightSlotRef.current) {
        rightSlotRef.current.style.transform = `translate3d(0, ${-scrollY * 0.12}px, 0)`;
      }

      rafId = requestAnimationFrame(onScroll);
    };

    rafId = requestAnimationFrame(onScroll);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Trigger typewriter scramble on initial page load AND on every route visit
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Scramble into initial words on first page load
      const t1 = setTimeout(() => leftScramble.triggerScramble(), 120);
      const t2 = setTimeout(() => rightScramble.triggerScramble(), 280);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      // On page visit / route change, scramble background typography!
      leftScramble.triggerScramble();
      const t = setTimeout(() => rightScramble.triggerScramble(), 160);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Periodic slow background scramble cycling (every 9.5s)
  useEffect(() => {
    const intervalLeft = setInterval(() => {
      leftScramble.nextWord();
    }, 9500);

    // Stagger right slot by 4.5s
    const timeoutRight = setTimeout(() => {
      rightScramble.nextWord();
      const intervalRight = setInterval(() => {
        rightScramble.nextWord();
      }, 9500);
      return () => clearInterval(intervalRight);
    }, 4500);

    return () => {
      clearInterval(intervalLeft);
      clearTimeout(timeoutRight);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden
    >
      {/* 1. Top-Left Monumental Word (Never overlaps Bottom-Right) */}
      <div
        ref={leftSlotRef}
        className="absolute select-none will-change-transform font-display font-black uppercase leading-[0.76] tracking-[-0.04em]"
        style={{
          top: "3vh",
          left: "2.5vw",
          maxWidth: "48vw",
          fontSize: "clamp(8rem, 18vw, 24rem)",
        }}
      >
        <div className="flex items-center justify-start whitespace-nowrap">
          {leftScramble.displayLetters.map((l, i) => (
            <span
              key={`left-char-${i}`}
              className="inline-block transition-colors duration-150 select-none font-display font-black"
              style={{
                color: l.isRed ? "rgba(239, 35, 60, 0.16)" : "rgba(244, 230, 227, 0.035)",
                WebkitTextStroke: "none",
                textShadow: "none",
              }}
            >
              {l.char}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Bottom-Right Monumental Word (Never overlaps Top-Left) */}
      <div
        ref={rightSlotRef}
        className="absolute select-none will-change-transform font-display font-black uppercase leading-[0.76] tracking-[-0.04em]"
        style={{
          bottom: "4vh",
          right: "2.5vw",
          maxWidth: "48vw",
          fontSize: "clamp(8rem, 18vw, 24rem)",
        }}
      >
        <div className="flex items-center justify-end whitespace-nowrap">
          {rightScramble.displayLetters.map((l, i) => (
            <span
              key={`right-char-${i}`}
              className="inline-block transition-colors duration-150 select-none font-display font-black"
              style={{
                color: l.isRed ? "rgba(239, 35, 60, 0.16)" : "rgba(244, 230, 227, 0.035)",
                WebkitTextStroke: "none",
                textShadow: "none",
              }}
            >
              {l.char}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
