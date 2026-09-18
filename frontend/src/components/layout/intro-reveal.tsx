import { useEffect, useState } from "react";

export type IntroStage = "splitx" | "scrambling" | "holding" | "sliding" | "landing" | "done";

interface IntroRevealProps {
  onStageChange?: (stage: IntroStage) => void;
  onSkip?: () => void;
}

/**
 * Tactical Valorant-Grade Intro Reveal Backdrop & HUD Overlay
 * 1. Stage 1: SPLITX letters appear sequentially in center (0ms -> 1600ms)
 * 2. Stage 2: Typewriter scribble animation scrambles SPLITX into KEEP (1600ms -> 2500ms)
 * 3. Stage 3: Center hold on KEEP (2500ms -> 2900ms)
 * 4. Stage 4: S-curve glide of KEEP into the quote headline (2900ms -> 4050ms)
 * 5. Stage 5: Landing & headline cascade (4050ms -> 4450ms)
 * 6. Stage 6: Done, veil unmounts (4450ms)
 */
export function IntroReveal({ onStageChange, onSkip }: IntroRevealProps) {
  const [stage, setStage] = useState<IntroStage>("splitx");

  // Propagate stage updates
  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);

  // Precise timeline progression (0ms start)
  useEffect(() => {
    // Stage 2: Scramble SPLITX into KEEP (2100ms)
    const scrambleTimer = setTimeout(() => {
      setStage("scrambling");
    }, 2100);

    // Stage 3: Center hold on KEEP (2950ms)
    const holdTimer = setTimeout(() => {
      setStage("holding");
    }, 2950);

    // Stage 4: Sliding KEEP from center to quote headline (3350ms)
    const slideTimer = setTimeout(() => {
      setStage("sliding");
    }, 3350);

    // Stage 5: Landing & headline cascade (4500ms)
    const landTimer = setTimeout(() => {
      setStage("landing");
    }, 4500);

    // Stage 6: Done, veil unmounts (4900ms)
    const doneTimer = setTimeout(() => {
      setStage("done");
    }, 4900);

    return () => {
      clearTimeout(scrambleTimer);
      clearTimeout(holdTimer);
      clearTimeout(slideTimer);
      clearTimeout(landTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  const handleSkip = () => {
    setStage("done");
    onSkip?.();
  };

  if (stage === "done") return null;

  const isSliding = stage === "sliding" || stage === "landing";

  return (
    <div
      onClick={handleSkip}
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-auto cursor-pointer select-none"
      title="Click anywhere to skip"
    >
      {/* Dark curtain backdrop - smoothly dissolves when KEEP travels to headline */}
      <div
        className="absolute inset-0 bg-[#0c0708] transition-opacity ease-out"
        style={{
          opacity: isSliding ? 0 : 1,
          transitionDuration: isSliding ? "950ms" : "200ms",
        }}
      />

      {/* Atmospheric ambient crimson bloom in center */}
      <div
        className="pointer-events-none absolute h-[480px] w-[480px] rounded-full bg-gradient-to-br from-hot/25 via-accent/15 to-transparent blur-3xl transition-all"
        style={{
          opacity: isSliding ? 0 : stage === "holding" ? 0.9 : 0.6,
          transform: isSliding ? "scale(0.7)" : "scale(1)",
          transitionDuration: isSliding ? "950ms" : "600ms",
          transitionTimingFunction: "cubic-bezier(0.76, 0, 0.24, 1)",
        }}
        aria-hidden
      />

      {/* ── Valorant Tactical Corner HUD: Top-Left ─────────────────────────── */}
      <div
        className="pointer-events-none fixed top-6 left-6 z-50 flex items-start gap-2.5 select-none transition-opacity duration-500"
        style={{ opacity: isSliding ? 0 : 0.85 }}
      >
        <div className="relative h-6 w-6">
          {/* Tactical bracket hair-lines */}
          <div className="absolute top-0 left-0 h-4 w-[1px] bg-hot/60" />
          <div className="absolute top-0 left-0 h-[1px] w-4 bg-hot/60" />

          {/* Anchor square */}
          <div className="absolute top-1 left-1 h-2 w-2 border border-hot/80 bg-hot/30" />

          {/* Up traveler square - splits up then retracts */}
          <div
            className="absolute top-1 left-1 h-2 w-2 border border-hot bg-hot shadow-[0_0_8px_rgba(239,35,60,0.6)]"
            style={{
              animation: "valorant-corner-tl-up 480ms cubic-bezier(0.76, 0, 0.24, 1) forwards",
            }}
          />

          {/* Right traveler square - splits right then retracts */}
          <div
            className="absolute top-1 left-1 h-2 w-2 border border-hot bg-hot shadow-[0_0_8px_rgba(239,35,60,0.6)]"
            style={{
              animation: "valorant-corner-tl-right 480ms cubic-bezier(0.76, 0, 0.24, 1) forwards",
            }}
          />
        </div>

        <div className="flex flex-col font-mono text-[9px] uppercase tracking-widest text-muted/60 leading-none pt-0.5">
          <span>SPLITX // PROTOCOL</span>
          <span className="text-[8px] text-faint mt-0.5">SYS.ONLINE</span>
        </div>
      </div>

      {/* ── Valorant Tactical Corner HUD: Bottom-Right ─────────────────────── */}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex items-end gap-2.5 select-none transition-opacity duration-500"
        style={{ opacity: isSliding ? 0 : 0.85 }}
      >
        <div className="flex flex-col items-end font-mono text-[9px] uppercase tracking-widest text-muted/60 leading-none pb-0.5">
          <span>TIME_TOKEN // 0x421614</span>
          <span className="text-[8px] text-faint mt-0.5">SEC.ESCROW</span>
        </div>

        <div className="relative h-6 w-6">
          {/* Tactical bracket hair-lines */}
          <div className="absolute bottom-0 right-0 h-4 w-[1px] bg-hot/60" />
          <div className="absolute bottom-0 right-0 h-[1px] w-4 bg-hot/60" />

          {/* Anchor square */}
          <div className="absolute bottom-1 right-1 h-2 w-2 border border-hot/80 bg-hot/30" />

          {/* Down traveler square - splits down then retracts */}
          <div
            className="absolute bottom-1 right-1 h-2 w-2 border border-hot bg-hot shadow-[0_0_8px_rgba(239,35,60,0.6)]"
            style={{
              animation: "valorant-corner-br-down 480ms cubic-bezier(0.76, 0, 0.24, 1) forwards",
            }}
          />

          {/* Left traveler square - splits left then retracts */}
          <div
            className="absolute bottom-1 right-1 h-2 w-2 border border-hot bg-hot shadow-[0_0_8px_rgba(239,35,60,0.6)]"
            style={{
              animation: "valorant-corner-br-left 480ms cubic-bezier(0.76, 0, 0.24, 1) forwards",
            }}
          />
        </div>
      </div>

      {/* Subtle skip indicator */}
      <div
        className="pointer-events-none absolute bottom-8 font-mono text-[11px] text-muted/40 tracking-wider uppercase transition-opacity duration-300"
        style={{ opacity: isSliding ? 0 : 0.6 }}
      >
        Click anywhere to skip
      </div>
    </div>
  );
}
