import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { HeroVisual } from "@/components/hero-visual";
import { IntroReveal, type IntroStage } from "@/components/layout/intro-reveal";
import { ServiceMarquee } from "@/components/layout/marquee";
import { AnimatedCounter, ImageReveal, Reveal, TextReveal } from "@/components/motion";
import { ProtocolFlow } from "@/components/protocol/flow";
import { SERVICES, getService, unitLabel } from "@/lib/catalog";
import { useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { cn, shortAddress } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

const SCRAMBLE_CHARS = "SPLITX0123456789ABCDEFGHJKMNPQRSTUVWYZ/#";
const INITIAL_SPLITX = [
  { char: "S", isRed: false },
  { char: "P", isRed: false },
  { char: "L", isRed: false },
  { char: "I", isRed: false },
  { char: "T", isRed: false },
  { char: "X", isRed: true },
];

const FLY_IN_DIRECTIONS = [
  { transform: "translate3d(-100vw, 0, 0)" },     // S: West (Left)
  { transform: "translate3d(0, -100vh, 0)" },     // P: North (Top)
  { transform: "translate3d(-80vw, 80vh, 0)" },   // L: South-West (Bottom-Left)
  { transform: "translate3d(80vw, -80vh, 0)" },   // I: North-East (Top-Right)
  { transform: "translate3d(0, 100vh, 0)" },      // T: South (Bottom)
  { transform: "translate3d(100vw, 0, 0)" },      // X: East (Right - glowing Red!)
];

function Home() {
  const snap = useLedger();
  const live = snap.listings.filter((l) => l.active);
  const featured = live[0];
  const featuredService = featured ? getService(featured.serviceId) : undefined;

  const [introStage, setIntroStage] = useState<IntroStage>("splitx");
  const [splitxCount, setSplitxCount] = useState(0);
  const [letters, setLetters] = useState(INITIAL_SPLITX);
  const [trailingRemoved, setTrailingRemoved] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const keepWordRef = useRef<HTMLSpanElement>(null);

  const isRevealed = introStage === "sliding" || introStage === "landing" || introStage === "done";
  const isDone = introStage === "done";
  const isSliding = introStage === "sliding" || introStage === "landing";

  // Calculate pixel-perfect screen center offset to anchor KEEP exactly in viewport center
  useLayoutEffect(() => {
    const updateOffset = () => {
      if (keepWordRef.current) {
        const prevTransform = keepWordRef.current.style.transform;
        keepWordRef.current.style.transform = "none";
        const rect = keepWordRef.current.getBoundingClientRect();
        keepWordRef.current.style.transform = prevTransform;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const wordCenterX = rect.left + rect.width / 2;
        const wordCenterY = rect.top + rect.height / 2;
        setOffset({
          x: Math.round(centerX - wordCenterX),
          y: Math.round(centerY - wordCenterY),
        });
      }
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [trailingRemoved]);

  // Stage 1: Sequential letter-by-letter entrance of S -> P -> L -> I -> T -> X flying in from separate directions
  useEffect(() => {
    if (introStage !== "splitx") return;
    const t1 = setTimeout(() => setSplitxCount(1), 100);  // S from Left
    const t2 = setTimeout(() => setSplitxCount(2), 320);  // P from Top
    const t3 = setTimeout(() => setSplitxCount(3), 540);  // L from Bottom-Left
    const t4 = setTimeout(() => setSplitxCount(4), 760);  // I from Top-Right
    const t5 = setTimeout(() => setSplitxCount(5), 980);  // T from Bottom
    const t6 = setTimeout(() => setSplitxCount(6), 1200); // X from Right (Red!)

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [introStage]);

  // Stage 2: Typewriter scribble/scramble animation morphing SPLITX into KEEP
  useEffect(() => {
    if (introStage !== "scrambling") return;

    let tick = 0;
    const target = ["K", "E", "E", "P"];

    const interval = setInterval(() => {
      tick++;

      setLetters((prev) => {
        return prev.map((item, idx) => {
          if (idx < 4) {
            const lockTick = 6 + idx * 4; // locks: K at tick 6, E at 10, E at 14, P at 18
            if (tick >= lockTick) {
              return { char: target[idx], isRed: false };
            }
            const randomChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            return { char: randomChar, isRed: idx === 5 };
          } else {
            // Trailing letters (T, X)
            if (tick >= 18) {
              return item;
            }
            const randomChar = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            return { char: randomChar, isRed: idx === 5 };
          }
        });
      });

      // Remove trailing letters after index 3 is locked
      if (tick >= 18) {
        setTrailingRemoved(true);
      }

      if (tick >= 22) {
        clearInterval(interval);
        setLetters([
          { char: "K", isRed: false },
          { char: "E", isRed: false },
          { char: "E", isRed: false },
          { char: "P", isRed: false },
        ]);
      }
    }, 32);

    return () => clearInterval(interval);
  }, [introStage]);

  const handleSkip = () => {
    setIntroStage("done");
    setSplitxCount(6);
    setTrailingRemoved(true);
    setLetters([
      { char: "K", isRed: false },
      { char: "E", isRed: false },
      { char: "E", isRed: false },
      { char: "P", isRed: false },
    ]);
  };

  return (
    <main className="relative">
      {/* Tactical Valorant-Grade Intro Overlay & Backdrop */}
      <IntroReveal onStageChange={setIntroStage} onSkip={handleSkip} />

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b border-line/40">
        <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-10 px-5 py-12 md:px-8 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="flex flex-col justify-center lg:col-span-7">
            {/* Kicker Pill - Arbitrum Sepolia Live */}
            <div
              className={cn(
                "transition-all duration-700 ease-out",
                isRevealed ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-6 filter blur-sm"
              )}
            >
              <div className="inline-flex items-center gap-2 border border-line bg-surface/80 px-3.5 py-1.5 backdrop-blur-sm">
                <span className="font-mono text-xs font-semibold tracking-wider text-fg uppercase">
                  Arbitrum Sepolia Live
                </span>
                <span className="text-faint">·</span>
                <span className="font-mono text-xs text-muted">Time-Tokenized Subscriptions</span>
              </div>
            </div>

            {/* Massive Designer Headline with Balanced Line Spacing and Deliberate S-Curve KEEP Travel */}
            <div className="mt-8">
              <h1 className="font-display text-[clamp(4.25rem,9.5vw,7.5rem)] leading-[0.89] tracking-[-0.01em] text-fg uppercase overflow-visible">
                {/* Line 1: SPLITX -> typewriter scramble -> KEEP (glides in with S-curve) + the days */}
                <div className="overflow-visible">
                  <span
                    ref={keepWordRef}
                    className={cn(
                      "inline-block align-baseline leading-none will-change-transform",
                      !isDone && "relative z-50 select-none drop-shadow-[0_0_35px_rgba(239,35,60,0.4)]"
                    )}
                    style={
                      isDone
                        ? undefined
                        : {
                            transform: isSliding
                              ? "translate3d(0, 0, 0) scale(1)"
                              : `translate3d(${offset.x}px, ${offset.y}px, 0) scale(1.15)`,
                            transition: isSliding
                              ? "transform 1150ms cubic-bezier(0.65, 0, 0.35, 1)"
                              : undefined,
                          }
                    }
                  >
                    {isDone ? (
                      "KEEP"
                    ) : (
                      letters.slice(0, trailingRemoved ? 4 : 6).map((item, i) => {
                        const isSplitxStage = introStage === "splitx";
                        const hasArrived = !isSplitxStage || splitxCount > i;
                        return (
                          <span
                            key={i}
                            className={cn(
                              "inline-block align-baseline leading-none select-none",
                              item.isRed
                                ? "text-hot drop-shadow-[0_0_25px_rgba(239,35,60,0.6)]"
                                : "text-fg"
                            )}
                            style={{
                              display: "inline-block",
                              verticalAlign: "baseline",
                              lineHeight: 1,
                              transform: isSplitxStage
                                ? hasArrived
                                  ? "translate3d(0, 0, 0)"
                                  : FLY_IN_DIRECTIONS[i]?.transform || "translate3d(0, 0, 0)"
                                : "none",
                              opacity: hasArrived ? 1 : 0,
                              filter: isSplitxStage && !hasArrived ? "blur(12px)" : "none",
                              transition: isSplitxStage
                                ? "transform 460ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease-out, filter 220ms ease-out"
                                : undefined,
                            }}
                          >
                            {item.char}
                          </span>
                        );
                      })
                    )}
                  </span>{" "}
                  <span className="inline-block overflow-visible align-baseline">
                    <span
                      className={cn(
                        "inline-block transition-all duration-700 ease-out",
                        isRevealed
                          ? "opacity-100 translate-y-0 filter-none delay-150"
                          : "opacity-0 translate-y-6 filter blur-sm"
                      )}
                    >
                      the days
                    </span>
                  </span>
                </div>

                {/* Line 2: you need. - Balanced spacing with mt-1 sm:mt-1.5 */}
                <div className="overflow-visible mt-1 sm:mt-1.5">
                  <span
                    className={cn(
                      "inline-block transition-all duration-700 ease-out",
                      isRevealed
                        ? "opacity-100 translate-y-0 filter-none delay-200"
                        : "opacity-0 translate-y-6 filter blur-sm"
                    )}
                  >
                    you need.
                  </span>
                </div>

                {/* Line 3: Sell the rest. - Balanced spacing with mt-1 sm:mt-1.5 */}
                <div className="overflow-visible mt-1 sm:mt-1.5">
                  <span
                    className={cn(
                      "inline-block text-hot drop-shadow-[0_0_35px_rgba(239,35,60,0.35)] transition-all duration-700 ease-out",
                      isRevealed
                        ? "opacity-100 translate-y-0 filter-none delay-300"
                        : "opacity-0 translate-y-6 filter blur-sm"
                    )}
                  >
                    Sell the rest.
                  </span>
                </div>
              </h1>
            </div>

            {/* Editorial Subtitle */}
            <p
              className={cn(
                "mt-6 max-w-lg text-base leading-relaxed text-muted md:text-lg transition-all duration-700 ease-out delay-300",
                isRevealed ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-6 filter blur-sm"
              )}
            >
              Buy the exact window of digital service access you'll use — then lock, split, and
              resell whatever is left. Real subscriptions, zero wasted days.
            </p>

            {/* CTAs */}
            <div
              className={cn(
                "mt-8 flex flex-wrap items-center gap-4 transition-all duration-700 ease-out delay-400",
                isRevealed ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-6 filter blur-sm"
              )}
            >
              <Link
                to="/marketplace"
                className="pill pill-solid text-sm font-semibold py-3 px-6 shadow-lg shadow-black/50 transition-all"
              >
                Explore leftover time →
              </Link>
              <Link to="/buy" className="pill text-sm font-semibold py-3 px-6">
                Buy a window
              </Link>
            </div>

            {/* Trust Metrics Bar */}
            <div
              className={cn(
                "mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line/70 pt-6 text-muted transition-all duration-700 ease-out delay-500",
                isRevealed ? "opacity-100 translate-y-0 filter-none" : "opacity-0 translate-y-6 filter blur-sm"
              )}
            >
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-hot" />
                <span className="font-semibold text-fg">
                  <AnimatedCounter value={live.length} /> active listings
                </span>
              </div>
              <span className="text-faint">/</span>
              <span className="font-mono text-xs text-muted">Arbitrum Sepolia</span>
              <span className="text-faint">/</span>
              <span className="font-mono text-xs text-muted">Buy · Split · Lock · Resell</span>
            </div>
          </div>

          {/* Right Column: Professional Time-Split Asset Terminal */}
          <div
            className={cn(
              "flex items-center justify-center lg:col-span-5 transition-all duration-700 ease-out delay-200",
              isRevealed ? "opacity-100 scale-100 filter-none" : "opacity-0 scale-95 filter blur-sm"
            )}
          >
            <HeroVisual featured={featured} featuredService={featuredService} />
          </div>
        </div>
      </section>

      <ServiceMarquee />

      {/* ═══ THE PROBLEM ════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <p className="meta">The problem</p>
          <TextReveal
            text="Subscriptions are sold in months. Life happens in days."
            className="font-display mt-4 max-w-4xl text-display leading-none"
          />
        </Reveal>
        <div className="mt-16 grid gap-px bg-line md:grid-cols-2">
          <Reveal>
            <article className="bg-bg py-8 pr-0 md:pr-12">
              <p className="font-display text-5xl text-hot">01</p>
              <h3 className="mt-5 text-xl font-medium">A provider sells thirty days.</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                You only need ten. SplitX lets you buy the shorter entitlement — same access, exact
                duration, paid in ETH.
              </p>
            </article>
          </Reveal>
          <Reveal delay={80}>
            <article className="bg-bg py-8 md:pl-12">
              <p className="font-display text-5xl text-hot">02</p>
              <h3 className="mt-5 text-xl font-medium">You used twenty of thirty.</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                Detach the rest, lock it, list it. Someone else finishes the window. Unused time
                becomes inventory instead of waste.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ═══ PROTOCOL BANNER ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-y border-line">
        <div className="absolute inset-0">
          <div className="duotone h-full w-full">
            <img src="/images/protocol.jpg" alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="absolute inset-0 bg-bg/55" />
        <div className="relative mx-auto max-w-7xl px-5 py-28 md:px-8">
          <Reveal>
            <p className="meta text-fg">Protocol</p>
            <TextReveal
              text="Unused time is an asset."
              className="font-display mt-4 max-w-3xl text-display leading-none text-fg"
            />
            <p className="mt-5 max-w-lg text-fg/85">
              The NFT is the access right the mock provider honors — lock it, split it, sell it,
              provision it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══ HOW IT WORKS (compact teaser) ══════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <p className="meta">How leftover time moves</p>
          <TextReveal
            text="Alice locks. Bob buys."
            className="font-display mt-4 text-display leading-none"
          />
        </Reveal>
        <div className="mt-16">
          <ProtocolFlow compact />
        </div>
        <div className="mt-10">
          <Link to="/how-it-works" className="pill">
            Read the full protocol →
          </Link>
        </div>
      </section>

      {/* ═══ PRIMARY MARKET (teaser — 3 cards max) ══════════════════════════ */}
      <section className="border-y border-line bg-bg-deep">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="meta">Primary market</p>
                <TextReveal
                  text="Buy only what you need"
                  className="font-display mt-3 text-display leading-none"
                />
              </div>
              <Link to="/buy" className="pill">
                View all services →
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(0, 3).map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <Link
                  to="/buy/$serviceId"
                  params={{ serviceId: s.id }}
                  className="card-lift group block overflow-hidden border border-line bg-surface"
                >
                  <div className="duotone aspect-4/3">
                    <img src={s.image} alt="" />
                  </div>
                  <div className="p-5">
                    <p className="meta">{s.category}</p>
                    <h3 className="mt-2 text-lg font-medium leading-snug">{s.name}</h3>
                    <p className="mt-2 text-sm text-muted">
                      {unitLabel(s.unit, s.packageDuration)} · {formatEthDisplay(s.packagePriceEth)}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECONDARY MARKET (teaser — featured + 2 max) ═══════════════════ */}
      {live.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="meta">Secondary market</p>
                <TextReveal
                  text="Already paid for."
                  className="font-display mt-3 text-display leading-none"
                />
              </div>
              <Link to="/marketplace" className="pill">
                Browse marketplace →
              </Link>
            </div>
          </Reveal>

          {featured && featuredService && (
            <Reveal>
              <article className="mt-12 grid overflow-hidden border border-line bg-surface lg:grid-cols-2">
                <div className="duotone min-h-64">
                  <img src={featuredService.image} alt="" />
                </div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="meta">
                    {featuredService.category} · Token #{featured.tokenId}
                  </p>
                  <h3 className="font-display mt-3 text-5xl leading-none">
                    {featuredService.name}
                  </h3>
                  <p className="mt-4 text-muted">
                    {unitLabel(featured.unit, featured.duration)} remaining · seller{" "}
                    {shortAddress(featured.seller)}
                  </p>
                  <p className="mt-6 text-3xl tabular-nums">{formatEthDisplay(featured.priceEth)}</p>
                  <Link
                    to="/listing/$tokenId"
                    params={{ tokenId: String(featured.tokenId) }}
                    className="pill pill-solid mt-6 inline-flex self-start"
                  >
                    Buy now
                  </Link>
                </div>
              </article>
            </Reveal>
          )}

          {live.length > 1 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {live.slice(1, 3).map((l, i) => {
                const s = getService(l.serviceId);
                if (!s) return null;
                return (
                  <Reveal key={l.tokenId} delay={i * 60}>
                    <Link
                      to="/listing/$tokenId"
                      params={{ tokenId: String(l.tokenId) }}
                      className="card-lift block border border-line bg-surface p-6"
                    >
                      <p className="meta">{s.category}</p>
                      <h3 className="mt-3 text-lg font-medium">{s.name}</h3>
                      <p className="mt-2 text-sm text-muted">{unitLabel(l.unit, l.duration)} remaining</p>
                      <p className="mt-5 tabular-nums text-xl">{formatEthDisplay(l.priceEth)}</p>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <section className="border-t border-line bg-bg-deep">
        <div className="mx-auto max-w-7xl px-5 py-28 md:px-8">
          <Reveal>
            <p className="meta text-accent">SplitX</p>
            <TextReveal
              text="Don't waste the rest."
              className="font-display mt-4 max-w-4xl text-display leading-none"
            />
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/marketplace" className="pill pill-solid">
                Explore leftover time
              </Link>
              <Link to="/buy" className="pill">
                Buy access
              </Link>
              <Link to="/how-it-works" className="pill">
                How it works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
