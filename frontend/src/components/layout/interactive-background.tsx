import { useEffect, useRef, useState } from "react";

/**
 * High-Concept Subterranean Security Watermark with Proximity Scanner
 * 1. Remains completely invisible / sleeping in the dark void until cursor moves.
 * 2. As the user moves their cursor, a 320px proximity spotlight reveals the subterranean
 *    monumental SPLITX wireframe watermark, precision crosshair grid, and cryptographic telemetry.
 * 3. Smoothly fades back into sleep when cursor is still or leaves the window.
 * 4. Zero particles, zero canvas lag, pure intentional architectural craft.
 */
export function InteractiveBackground() {
  const [mousePos, setMousePos] = useState({ x: -999, y: -999 });
  const [isActive, setIsActive] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only activate on devices with fine pointer (mouse)
    const isFine = window.matchMedia("(pointer: fine)").matches;
    if (!isFine) return;

    const handlePointerMove = (e: PointerEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setIsActive(true);

      // Clear existing idle timer
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      // Softly dim back into sleep after 2.5s of no movement
      idleTimerRef.current = setTimeout(() => {
        setIsActive(false);
      }, 2500);
    };

    const handlePointerLeave = () => {
      setIsActive(false);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-700 ease-out"
      style={{
        opacity: isActive ? 1 : 0,
        maskImage: `radial-gradient(circle 340px at ${mousePos.x}px ${mousePos.y}px, black 0%, rgba(0,0,0,0.4) 65%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(circle 340px at ${mousePos.x}px ${mousePos.y}px, black 0%, rgba(0,0,0,0.4) 65%, transparent 100%)`,
      }}
      aria-hidden
    >
      {/* Tactical Architectural Blueprint Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f4e6e308_1px,transparent_1px),linear-gradient(to_bottom,#f4e6e308_1px,transparent_1px)] bg-[size:100px_100px]" />

      {/* Massive Subterranean SPLITX Wireframe Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="font-display text-[24vw] leading-none font-black tracking-[-0.03em] uppercase text-transparent [-webkit-text-stroke:1px_rgba(239,35,60,0.18)] drop-shadow-[0_0_25px_rgba(239,35,60,0.12)] select-none">
          SPLITX
        </span>
      </div>

      {/* Cryptographic Protocol Telemetry Details */}
      <div className="absolute top-1/4 left-12 font-mono text-[9px] uppercase tracking-[0.25em] text-hot/50">
        ◈ SEC // SUBTERRANEAN_TELEMETRY
      </div>
      <div className="absolute bottom-1/4 right-12 font-mono text-[9px] uppercase tracking-[0.25em] text-muted/40">
        PROTOCOL_CORE // 0x421614_SEPOLIA
      </div>
      <div className="absolute bottom-12 left-1/3 font-mono text-[8px] uppercase tracking-[0.3em] text-hot/30">
        PROXIMITY_BEAM // SCANNER_ACTIVE
      </div>
    </div>
  );
}
