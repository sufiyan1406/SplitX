import { Magnetic, Reveal } from "@/components/motion";
import { AliceBobDiagram, ProtocolFlow } from "@/components/protocol/flow";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/how-it-works")({ component: HowItWorks });

const STEPS = [
  { n: "01", t: "Buy only what you need", d: "Pick a service and a duration. Pay ETH for that window — not the provider's 30-day default." },
  { n: "02", t: "Or buy a normal package", d: "Need the full month? Take the direct package. Same NFT, same rules." },
  { n: "03", t: "Lock leftover time", d: "If you stop early, lock remaining duration in SplitX. Usage freezes for you." },
  { n: "04", t: "Tokenize the entitlement", d: "The NFT is the access right. Split it if you only want to sell part of the remainder." },
  { n: "05", t: "List it", d: "Approve the NFT, then list. Platform 5% · Provider 5% · Seller 90%." },
  { n: "06", t: "Someone buys", d: "A buyer pays the list price. The listing closes." },
  { n: "07", t: "Ownership transfers on-chain", d: "Token ID, owner, and status come from the ledger — never from local React guesses." },
  { n: "08", t: "Provider adapter provisions", d: "The mock provider grants the new owner access and revokes the seller. Demo providers only." },
];

function HowItWorks() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-line">
        <div className="duotone absolute inset-0">
          <img src="/images/protocol.jpg" alt="" />
        </div>
        <div className="absolute inset-0 bg-bg/60" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 md:px-8">
          <p className="meta text-fg">Protocol</p>
          <h1 className="font-display mt-4 max-w-3xl text-display leading-none text-fg">
            How leftover time moves.
          </h1>
          <p className="mt-5 max-w-lg text-fg/85">
            A marketplace for unused digital-service time. The NFT is not a collectible — it is the
            entitlement the provider honors.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <Reveal>
          <p className="meta">Diagram</p>
          <h2 className="font-display mt-3 text-display leading-none">From leftover to live access</h2>
        </Reveal>
        <div className="mt-12">
          <AliceBobDiagram />
        </div>
        <div className="mt-16">
          <ProtocolFlow />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-20 md:px-8">
        <ol>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 30}>
              <li className="grid gap-4 border-b border-line py-8 md:grid-cols-[5.5rem_1fr]">
                <p className="font-display text-4xl text-hot">{s.n}</p>
                <div>
                  <h2 className="text-xl font-medium leading-snug">{s.t}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{s.d}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>

        <div className="mt-12 border border-line bg-surface p-8">
          <p className="meta">Reputation</p>
          <h2 className="font-display mt-2 text-4xl">Coming soon</h2>
          <p className="mt-3 text-sm text-muted">
            No fake scores. When the chain exposes history, we will surface successful transactions,
            verified providers, and marketplace activity.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Magnetic>
            <Link to="/buy" className="pill pill-solid">
              Buy access
            </Link>
          </Magnetic>
          <Magnetic>
            <Link to="/marketplace" className="pill">
              Marketplace
            </Link>
          </Magnetic>
        </div>
      </section>
    </main>
  );
}
