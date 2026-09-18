import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: "01", t: "Buy", d: "Exact days, not the full package." },
  { n: "02", t: "Use", d: "Time burns against the NFT." },
  { n: "03", t: "Split", d: "Detach leftover duration." },
  { n: "04", t: "Lock", d: "Listed tokens cannot be used." },
  { n: "05", t: "List", d: "5% platform · 5% provider · 90% you." },
  { n: "06", t: "Resell", d: "A buyer pays ETH on-chain." },
  { n: "07", t: "Transfer", d: "Owner updates from the ledger." },
  { n: "08", t: "Provision", d: "Mock provider grants access." },
] as const;

export function ProtocolFlow({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={cn("grid gap-px bg-line", compact ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4")}>
      {STEPS.map((s, i) => (
        <Reveal key={s.n} delay={i * 40}>
          <li className="bg-bg p-5">
            <p className="font-display text-3xl text-hot">{s.n}</p>
            <h3 className="mt-4 text-lg font-medium leading-none">{s.t}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.d}</p>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}

export function AliceBobDiagram() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
      <Reveal>
        <article className="flex h-full flex-col overflow-hidden border border-line bg-surface">
          <div className="duotone h-44">
            <img src="/images/svc-stream.jpg" alt="" />
          </div>
          <div className="flex flex-1 flex-col p-6">
            <p className="meta">Wallet A · Alice</p>
            <h3 className="font-display mt-2 text-4xl leading-none">Buys 30 days</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Uses 20. Ten leftover days are split, locked, and listed. Alice cannot use the listed
              NFT.
            </p>
            <p className="meta mt-auto pt-6 text-faint">Status · Locked in SplitX</p>
          </div>
        </article>
      </Reveal>

      <Reveal delay={80}>
        <div className="flex flex-col items-center justify-center gap-3 px-2 py-6 text-center">
          <p className="meta">On-chain</p>
          <p className="font-display text-5xl leading-none">NFT</p>
          <p className="text-sm text-muted">
            Ownership moves
            <br />
            0.008 ETH
          </p>
          <span className="text-accent">/</span>
          <p className="meta">Mock provider</p>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <article className="flex h-full flex-col overflow-hidden border border-line bg-surface">
          <div className="duotone h-44">
            <img src="/images/svc-stream.jpg" alt="" />
          </div>
          <div className="flex flex-1 flex-col p-6">
            <p className="meta">Wallet B · Bob</p>
            <h3 className="font-display mt-2 text-4xl leading-none">Buys 10 days</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Pays the list price. Token ownership changes. The mock provider provisions Bob — not a
              collectible, an access right.
            </p>
            <p className="meta mt-auto pt-6 text-ok">Status · Active · Provisioned</p>
          </div>
        </article>
      </Reveal>
    </div>
  );
}

export function JudgePath() {
  const steps = [
    { who: "A", t: "Connect Demo Wallet A" },
    { who: "A", t: "Buy Access · Netflix · 30 days" },
    { who: "A", t: "My Assets · simulate 20 days used" },
    { who: "A", t: "Sell Unused · lock & list 10 days" },
    { who: "B", t: "Switch to Demo Wallet B" },
    { who: "B", t: "Marketplace · buy the 10-day listing" },
    { who: "B", t: "Assets + Provider log update" },
  ];

  return (
    <ol className="grid gap-0">
      {steps.map((s, i) => (
        <li
          key={s.t}
          className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0"
        >
          <span className="font-display w-10 text-2xl leading-none text-hot">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "meta rounded-xs border px-3 py-1",
              s.who === "A" ? "border-line text-fg" : "border-accent text-accent",
            )}
          >
            Wallet {s.who}
          </span>
          <span className="text-sm text-muted">{s.t}</span>
        </li>
      ))}
    </ol>
  );
}
