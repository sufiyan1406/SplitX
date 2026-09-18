import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatEthDisplay } from "@/lib/eth";
import { shortAddress } from "@/lib/utils";
import { unitLabel } from "@/lib/catalog";
import type { Listing, Service } from "@/types/splitx";

interface HeroVisualProps {
  featured?: Listing;
  featuredService?: Service;
}

/**
 * Designer-Grade Time-Split Protocol Terminal
 * Replaces random sci-fi radar circles with an authentic, interactive Web3 financial asset card
 * that visually demonstrates the exact mechanics of splitting and recovering subscription time.
 */
export function HeroVisual({ featured, featuredService }: HeroVisualProps) {
  // Interactive simulation of days split: default to 10 days split out of 30
  const [splitDays, setSplitDays] = useState(10);
  const totalDays = 30;
  const keptDays = totalDays - splitDays;

  // Calculated values based on standard Netflix tier (~0.0008 ETH/day)
  const ratePerDay = 0.0008;
  const originalCost = (totalDays * ratePerDay).toFixed(4);
  const recoveredEth = (splitDays * ratePerDay).toFixed(4);
  const savingsPct = Math.round((splitDays / totalDays) * 100);

  const keptPct = Math.round((keptDays / totalDays) * 100);
  const splitPct = 100 - keptPct;

  return (
    <div className="relative w-full max-w-lg">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-br from-hot/20 via-transparent to-accent/10 blur-2xl" />

      {/* Main Terminal Card */}
      <div className="relative overflow-hidden border border-line/80 bg-surface/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Subtle top edge specular highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* ── Header: Tokenized Asset Info ────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-line/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-hot/30 bg-gradient-to-br from-hot/20 to-accent/30 font-display text-xl text-hot shadow-inner">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg tracking-wider text-fg uppercase">
                  Netflix Premium
                </span>
                <span className="bg-hot/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-hot uppercase">
                  4K HDR
                </span>
              </div>
              <p className="font-mono text-xs text-muted">
                30-Day Entitlement · Token #{featured?.tokenId ?? "11"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border border-ok/30 bg-ok/10 px-2.5 py-1 font-mono text-[11px] text-ok">
            <span className="h-1.5 w-1.5 bg-ok animate-pulse" />
            <span>Escrow Locked</span>
          </div>
        </div>

        {/* ── Centerpiece: Interactive Visual Time Splitter ───────── */}
        <div className="py-6">
          <div className="flex items-center justify-between text-xs font-mono text-muted mb-2.5">
            <span>SPLIT CONFIGURATION</span>
            <span className="text-fg font-semibold">{splitDays} Days Detached</span>
          </div>

          {/* Time Bar Visualizer */}
          <div className="relative h-12 w-full overflow-hidden border border-line bg-bg p-1">
            <div className="flex h-full w-full gap-1">
              {/* Retained / Kept Segment */}
              <div
                style={{ width: `${keptPct}%` }}
                className="relative flex items-center justify-center bg-gradient-to-r from-accent/90 to-hot/80 transition-all duration-300 ease-out"
              >
                <span className="truncate px-2 font-mono text-[11px] font-bold text-white uppercase tracking-wider">
                  Kept: {keptDays}d
                </span>
              </div>

              {/* Split Indicator Line */}
              <div className="relative flex items-center justify-center px-0.5">
                <div className="h-full w-0.5 bg-fg shadow-[0_0_8px_#fff]" />
              </div>

              {/* Detached / Listed Segment */}
              <div
                style={{ width: `${splitPct}%` }}
                className="relative flex items-center justify-center border border-dashed border-ok/60 bg-ok/10 transition-all duration-300 ease-out"
              >
                <span className="truncate px-2 font-mono text-[11px] font-bold text-ok uppercase tracking-wider">
                  Listed: {splitDays}d
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="mt-3.5">
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={splitDays}
              onChange={(e) => setSplitDays(Number(e.target.value))}
              className="w-full accent-hot cursor-pointer"
              aria-label="Adjust days to split"
            />
            <div className="flex justify-between font-mono text-[10px] text-muted mt-1">
              <span>Kept: 5d min</span>
              <span className="text-hot font-bold">Drag slider to simulate split</span>
              <span>Kept: 25d max</span>
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div className="mt-5 grid grid-cols-3 gap-2 border border-line/60 bg-bg/60 p-3.5 text-center">
            <div>
              <p className="font-mono text-[10px] text-muted uppercase">Original Cost</p>
              <p className="font-mono text-sm font-semibold text-fg mt-0.5">
                {originalCost} ETH
              </p>
            </div>
            <div className="border-x border-line/60">
              <p className="font-mono text-[10px] text-ok uppercase">Recovered ETH</p>
              <p className="font-mono text-sm font-bold text-ok mt-0.5">
                +{recoveredEth} ETH
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-hot uppercase">Net Savings</p>
              <p className="font-mono text-sm font-bold text-hot mt-0.5">
                {savingsPct}% Saved
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Active Secondary Market Order ───────── */}
        <div className="border border-line bg-surface-2/90 p-4 transition-all duration-200 hover:border-hot/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-hot animate-ping" />
                <span className="text-fg font-medium uppercase">
                  {featuredService?.name ?? "Netflix Premium"}
                </span>
                <span>·</span>
                <span>{featured?.duration ?? 10} Days Leftover</span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-fg">
                  {featured ? formatEthDisplay(featured.priceEth) : "0.008 ETH"}
                </span>
                <span className="font-mono text-xs text-muted">
                  seller {featured ? shortAddress(featured.seller) : "0xcd65...7865"}
                </span>
              </div>
            </div>

            <Link
              to="/marketplace"
              className="pill pill-solid py-2.5 px-5 text-xs font-semibold shadow-lg shadow-black/50 transition-all"
            >
              Buy now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
