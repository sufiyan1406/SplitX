import { PageIntro } from "@/components/layout/page-intro";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Magnetic, Reveal } from "@/components/motion";
import { CATEGORIES, getService, SERVICES, unitLabel } from "@/lib/catalog";
import { useLedger, useLiveSyncStatus } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { useAppMode } from "@/lib/mode-context";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/marketplace")({ component: MarketplacePage });

type MarketType = "all" | "primary" | "secondary";
type DurBucket = "all" | "1-3" | "4-7" | "8-15" | "16-30";
type Sort = "low" | "high";

function inBucket(duration: number, unit: string, bucket: DurBucket) {
  if (bucket === "all") return true;
  const days = unit === "credits" ? Math.round(duration / 50) : duration;
  if (bucket === "1-3") return days >= 1 && days <= 3;
  if (bucket === "4-7") return days >= 4 && days <= 7;
  if (bucket === "8-15") return days >= 8 && days <= 15;
  return days >= 16;
}

function MarketplacePage() {
  const snap = useLedger();
  const { mode, setMode } = useAppMode();
  const { isSyncing, initialPending } = useLiveSyncStatus();
  const [marketType, setMarketType] = useState<MarketType>("all");
  const [cat, setCat] = useState<string>("all");
  const [dur, setDur] = useState<DurBucket>("all");
  const [sort, setSort] = useState<Sort>("low");

  // Secondary listings
  const secondaryListings = useMemo(() => {
    let rows = snap.listings.filter((l) => l.active);
    rows = rows.filter((l) => {
      const s = getService(l.serviceId);
      if (!s) return false;
      if (cat !== "all" && s.category !== cat) return false;
      if (!inBucket(l.duration, l.unit, dur)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const da = Number(a.priceEth);
      const db = Number(b.priceEth);
      return sort === "low" ? da - db : db - da;
    });
    return rows;
  }, [snap.listings, cat, dur, sort]);

  // Primary services
  const primaryServices = useMemo(() => {
    let rows = SERVICES;
    if (cat !== "all") {
      rows = rows.filter((s) => s.category === cat);
    }
    rows = [...rows].sort((a, b) => {
      const da = Number(a.packagePriceEth);
      const db = Number(b.packagePriceEth);
      return sort === "low" ? da - db : db - da;
    });
    return rows;
  }, [cat, sort]);

  const isLoading = (initialPending || isSyncing) && secondaryListings.length === 0;

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageIntro kicker="SplitX Marketplace" title="Subscriptions & Unused Time.">
            Buy new access windows directly from providers, or purchase peer-to-peer unused days at steep discounts.
          </PageIntro>
          <div className="flex items-center gap-2 pb-2 text-xs font-mono text-muted">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isSyncing ? "bg-accent animate-ping" : "bg-hot"
              )}
            />
            <span>{isSyncing ? "Syncing Arbitrum Sepolia..." : "Arbitrum Sepolia Live"}</span>
          </div>
        </div>
      </Reveal>

      {/* Mode status indicator banner */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-line/80 bg-surface/40 p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          {mode === "buyer" ? (
            <span className="flex size-7 items-center justify-center bg-hot/15 text-hot">
              <ShoppingCart className="size-3.5" />
            </span>
          ) : (
            <span className="flex size-7 items-center justify-center bg-hot/15 text-hot">
              <Globe className="size-3.5" />
            </span>
          )}
          <div>
            <p className="text-xs font-semibold text-fg">
              {mode === "buyer"
                ? "Buyer Mode Active · Ready to purchase"
                : "Browser Mode Active · Exploring SplitX market"}
            </p>
            <p className="text-[11px] text-muted">
              {mode === "buyer"
                ? "Connected with buyer balance. Purchases settle immediately on-chain."
                : "Freely browse subscriptions and secondary listings. Switch to Buyer Mode when ready to buy."}
            </p>
          </div>
        </div>

        {mode !== "buyer" && (
          <button
            type="button"
            className="pill pill-solid py-1 text-xs"
            onClick={() => setMode("buyer")}
          >
            <ShoppingCart className="mr-1.5 size-3 inline" />
            Switch to Buyer Mode
          </button>
        )}
      </div>

      {/* Market Type Selector Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <button
          type="button"
          onClick={() => setMarketType("all")}
          className={cn(
            "pill py-2 text-xs uppercase tracking-wider font-mono",
            marketType === "all" ? "pill-solid" : ""
          )}
        >
          All Items ({primaryServices.length + secondaryListings.length})
        </button>
        <button
          type="button"
          onClick={() => setMarketType("primary")}
          className={cn(
            "pill py-2 text-xs uppercase tracking-wider font-mono",
            marketType === "primary" ? "pill-solid" : ""
          )}
        >
          Primary Subscriptions ({primaryServices.length})
        </button>
        <button
          type="button"
          onClick={() => setMarketType("secondary")}
          className={cn(
            "pill py-2 text-xs uppercase tracking-wider font-mono",
            marketType === "secondary" ? "pill-solid" : ""
          )}
        >
          Secondary Resales ({secondaryListings.length})
        </button>
      </div>

      {/* Filter Row */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip on={cat === "all"} onClick={() => setCat("all")}>
            All Categories
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c} on={cat === c} onClick={() => setCat(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {marketType !== "primary" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="meta mr-2">Resale Duration</span>
              {(["all", "1-3", "4-7", "8-15", "16-30"] as DurBucket[]).map((b) => (
                <FilterChip key={b} on={dur === b} onClick={() => setDur(b)}>
                  {b === "all" ? "Any Duration" : `${b} days`}
                </FilterChip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta mr-2">Price</span>
            <FilterChip on={sort === "low"} onClick={() => setSort("low")}>
              Low → High
            </FilterChip>
            <FilterChip on={sort === "high"} onClick={() => setSort("high")}>
              High → Low
            </FilterChip>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-hot border-t-transparent" />
            <span>Querying active listings from Arbitrum Sepolia contracts...</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse border border-line bg-surface/50 p-6">
                <div className="h-4 w-24 bg-line/60" />
                <div className="mt-4 h-7 w-48 bg-line/60" />
                <div className="mt-2 h-4 w-32 bg-line/40" />
                <div className="mt-8 flex items-end justify-between border-t border-line/40 pt-4">
                  <div className="h-6 w-20 bg-line/60" />
                  <div className="h-8 w-24 rounded-full bg-line/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {/* Secondary Listings Section (if in 'all' or 'secondary') */}
          {(marketType === "all" || marketType === "secondary") && (
            <section>
              {marketType === "all" && (
                <div className="mb-4 flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 bg-hot" />
                    <h2 className="font-display text-2xl uppercase tracking-wide">Secondary Resales</h2>
                    <span className="meta text-muted">({secondaryListings.length} active)</span>
                  </div>
                  <span className="meta text-hot">Peer-to-peer unused days</span>
                </div>
              )}

              {secondaryListings.length === 0 ? (
                <div className="border border-line bg-surface/40 p-8 text-center">
                  <p className="text-muted">No active resale listings match your filters.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {secondaryListings.map((l, i) => (
                    <ListingCard key={l.tokenId} listing={l} delay={i * 30} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Primary Subscriptions Section (if in 'all' or 'primary') */}
          {(marketType === "all" || marketType === "primary") && (
            <section>
              {marketType === "all" && (
                <div className="mb-4 flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 bg-accent" />
                    <h2 className="font-display text-2xl uppercase tracking-wide">Primary Subscriptions</h2>
                    <span className="meta text-muted">({primaryServices.length} available)</span>
                  </div>
                  <span className="meta text-accent">Direct from providers</span>
                </div>
              )}

              {primaryServices.length === 0 ? (
                <div className="border border-line bg-surface/40 p-8 text-center">
                  <p className="text-muted">No primary subscriptions match your filters.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {primaryServices.map((s, i) => (
                    <Reveal key={s.id} delay={i * 30}>
                      <article className="group flex h-full flex-col overflow-hidden border border-line bg-surface transition-[box-shadow] duration-200 hover:[box-shadow:var(--shadow-border-hover)]">
                        <Link to="/buy/$serviceId" params={{ serviceId: s.id }} className="block">
                          <div className="duotone aspect-4/3 overflow-hidden">
                            <img
                              src={s.image}
                              alt=""
                              className="transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="meta">{s.category}</p>
                              <span className="meta border border-line/60 px-2 py-0.5 text-accent">
                                Direct Access
                              </span>
                            </div>
                            <h3 className="mt-2 text-lg font-medium leading-snug text-fg">{s.name}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-2">{s.blurb}</p>
                            <p className="mt-4 text-sm text-fg">
                              Package {unitLabel(s.unit, s.packageDuration)} · {formatEthDisplay(s.packagePriceEth)}
                            </p>
                            <p className="meta mt-2">Provider · {s.provider}</p>
                          </div>
                        </Link>
                        <div className="mt-auto px-5 pb-5">
                          <Magnetic>
                            <Link
                              to="/buy/$serviceId"
                              params={{ serviceId: s.id }}
                              className="pill pill-solid w-full"
                            >
                              Buy access
                            </Link>
                          </Magnetic>
                        </div>
                      </article>
                    </Reveal>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cn("pill py-2", on && "pill-solid")}>
      {children}
    </button>
  );
}
