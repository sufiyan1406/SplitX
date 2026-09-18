import { ServiceMarquee } from "@/components/layout/marquee";
import { Magnetic, Reveal } from "@/components/motion";
import { AliceBobDiagram, JudgePath, ProtocolFlow } from "@/components/protocol/flow";
import { SERVICES, getService, unitLabel } from "@/lib/catalog";
import { useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { shortAddress } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const snap = useLedger();
  const live = snap.listings.filter((l) => l.active);
  const featured = live[0];
  const featuredService = featured ? getService(featured.serviceId) : undefined;
  const lead = SERVICES[0];

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid min-h-[calc(100dvh-3.75rem)] max-w-7xl lg:grid-cols-12">
          <div className="flex flex-col justify-between px-5 py-10 md:px-8 lg:col-span-7 lg:py-14">
            <p className="meta text-accent">Entitlements, not collectibles</p>

            <div className="py-10 lg:py-0">
              <h1 className="font-display text-hero leading-hero text-fg">
                Keep the days you need.
                <br />
                <em className="text-hot">Sell the rest.</em>
              </h1>
              <p className="mt-7 max-w-md text-base leading-relaxed text-muted md:text-lg">
                Buy the exact window of digital service access you’ll use — then lock, split, and
                list whatever is left. Time is the asset.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Magnetic>
                  <Link to="/marketplace" className="pill pill-solid">
                    Explore leftover time
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link to="/buy" className="pill">
                    Buy a window
                  </Link>
                </Magnetic>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted">
              <span className="meta text-fg">{live.length} live listings</span>
              <span className="text-faint">/</span>
              <span className="meta">Arbitrum Sepolia</span>
              <span className="text-faint">/</span>
              <span className="meta">Buy · Split · Lock · Resell</span>
            </div>
          </div>

          <div className="relative min-h-80 lg:col-span-5 lg:min-h-full">
            <div className="duotone absolute inset-0 lg:inset-y-0 lg:right-0">
              <img src="/images/hero.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            {featured && featuredService && (
              <article className="absolute inset-x-5 bottom-5 border border-line bg-bg/90 p-5 md:inset-x-8">
                <p className="meta">Live leftover · Token #{featured.tokenId}</p>
                <h2 className="font-display mt-2 text-3xl leading-none">{featuredService.name}</h2>
                <p className="mt-2 text-sm text-muted">
                  {unitLabel(featured.unit, featured.duration)} remaining · {shortAddress(featured.seller)}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-2xl tabular-nums">{formatEthDisplay(featured.priceEth)}</p>
                  <Link
                    to="/listing/$tokenId"
                    params={{ tokenId: String(featured.tokenId) }}
                    className="pill pill-solid"
                  >
                    Buy now
                  </Link>
                </div>
              </article>
            )}
          </div>
        </div>
      </section>

      <ServiceMarquee />

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <p className="meta">The problem</p>
          <h2 className="font-display mt-4 max-w-4xl text-display leading-none">
            Subscriptions are sold in months.{" "}
            <em className="text-muted">Life happens in days.</em>
          </h2>
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

      <section className="relative overflow-hidden border-y border-line">
        <div className="duotone absolute inset-0">
          <img src="/images/protocol.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-bg/55" />
        <div className="relative mx-auto max-w-7xl px-5 py-28 md:px-8">
          <p className="meta text-fg">Protocol</p>
          <h2 className="font-display mt-4 max-w-3xl text-display leading-none text-fg">
            Unused time is an asset.
          </h2>
          <p className="mt-5 max-w-lg text-fg/85">
            The NFT is the access right the mock provider honors — lock it, split it, sell it,
            provision it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <p className="meta">How leftover time moves</p>
          <h2 className="font-display mt-4 text-display leading-none">
            Alice locks. <em className="text-hot">Bob buys.</em>
          </h2>
        </Reveal>
        <div className="mt-12">
          <AliceBobDiagram />
        </div>
        <div className="mt-16">
          <ProtocolFlow compact />
        </div>
        <div className="mt-10">
          <Link to="/how-it-works" className="pill">
            Read the protocol
          </Link>
        </div>
      </section>

      <section className="border-y border-line bg-bg-deep">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="meta">Primary market</p>
                <h2 className="font-display mt-3 text-display leading-none">
                  Buy only what you need
                </h2>
              </div>
              <Link to="/buy" className="pill">
                All services
              </Link>
            </div>
          </Reveal>

          {lead && (
            <Reveal>
              <Link
                to="/buy/$serviceId"
                params={{ serviceId: lead.id }}
                className="group mt-12 grid overflow-hidden border border-line bg-surface lg:grid-cols-2"
              >
                <div className="duotone min-h-72">
                  <img
                    src={lead.image}
                    alt=""
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="meta">{lead.category}</p>
                  <h3 className="font-display mt-3 text-5xl leading-none">{lead.name}</h3>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{lead.blurb}</p>
                  <p className="mt-6 tabular-nums text-fg">
                    {unitLabel(lead.unit, lead.packageDuration)} · {formatEthDisplay(lead.packagePriceEth)}
                  </p>
                </div>
              </Link>
            </Reveal>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(1, 7).map((s, i) => (
              <Reveal key={s.id} delay={i * 50}>
                <Link
                  to="/buy/$serviceId"
                  params={{ serviceId: s.id }}
                  className="group block overflow-hidden border border-line bg-surface"
                >
                  <div className="duotone aspect-4/3">
                    <img
                      src={s.image}
                      alt=""
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
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

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="meta">Secondary market</p>
              <h2 className="font-display mt-3 text-display leading-none">Already paid for.</h2>
            </div>
            <Link to="/marketplace" className="pill">
              All listings
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
                <Magnetic>
                  <Link
                    to="/listing/$tokenId"
                    params={{ tokenId: String(featured.tokenId) }}
                    className="pill pill-solid mt-6 inline-flex"
                  >
                    Buy now
                  </Link>
                </Magnetic>
              </div>
            </article>
          </Reveal>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {live.slice(1, 4).map((l, i) => {
            const s = getService(l.serviceId);
            if (!s) return null;
            return (
              <Reveal key={l.tokenId} delay={i * 50}>
                <Link
                  to="/listing/$tokenId"
                  params={{ tokenId: String(l.tokenId) }}
                  className="block border border-line bg-surface p-6"
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
      </section>

      <section className="border-y border-line bg-bg-deep">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-2 md:px-8">
          <div>
            <Reveal>
              <p className="meta">Hackathon demo</p>
              <h2 className="font-display mt-3 text-display leading-none">Run the full loop.</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                No MetaMask required. Connect Demo Wallet A as the seller, Wallet B as the buyer.
                The demo ledger stands in until contracts are deployed.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/buy/$serviceId" params={{ serviceId: "netflix" }} className="pill pill-solid">
                  Start with Netflix
                </Link>
                <Link to="/provider" className="pill">
                  Provider log
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={80}>
            <div className="border border-line bg-surface px-5 py-2">
              <JudgePath />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-28 md:px-8">
        <p className="meta">SplitX</p>
        <h2 className="font-display mt-4 max-w-4xl text-display leading-none">
          Don’t waste the rest.
        </h2>
        <div className="mt-10 flex flex-wrap gap-3">
          <Magnetic>
            <Link to="/marketplace" className="pill pill-solid">
              Explore leftover time
            </Link>
          </Magnetic>
          <Magnetic>
            <Link to="/buy" className="pill">
              Buy access
            </Link>
          </Magnetic>
        </div>
      </section>
    </main>
  );
}
