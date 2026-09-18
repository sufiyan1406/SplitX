import { PageIntro } from "@/components/layout/page-intro";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Reveal } from "@/components/motion";
import { CATEGORIES, getService } from "@/lib/catalog";
import { useLedger } from "@/lib/chain/ledger";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/marketplace")({ component: MarketplacePage });

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
  const [cat, setCat] = useState<string>("all");
  const [dur, setDur] = useState<DurBucket>("all");
  const [sort, setSort] = useState<Sort>("low");

  const listings = useMemo(() => {
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

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <Reveal>
        <PageIntro kicker="Secondary market" title="Already paid for.">
          Unused time, locked as NFTs from people who don’t need the rest.
        </PageIntro>
      </Reveal>

      <div className="mt-10 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip on={cat === "all"} onClick={() => setCat("all")}>
            All
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c} on={cat === c} onClick={() => setCat(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="meta mr-2">Duration</span>
          {(["all", "1-3", "4-7", "8-15", "16-30"] as DurBucket[]).map((b) => (
            <FilterChip key={b} on={dur === b} onClick={() => setDur(b)}>
              {b === "all" ? "Any" : `${b} days`}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="meta mr-2">Price</span>
          <FilterChip on={sort === "low"} onClick={() => setSort("low")}>
            Low → High
          </FilterChip>
          <FilterChip on={sort === "high"} onClick={() => setSort("high")}>
            High → Low
          </FilterChip>
        </div>
      </div>

      {listings.length === 0 ? (
        <p className="mt-16 text-muted">No active listings match those filters.</p>
      ) : (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l, i) => (
            <ListingCard key={l.tokenId} listing={l} delay={i * 40} />
          ))}
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
