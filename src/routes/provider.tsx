import { PageIntro } from "@/components/layout/page-intro";
import { Reveal } from "@/components/motion";
import { getService, unitLabel } from "@/lib/catalog";
import { useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { shortAddress } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/provider")({ component: ProviderPage });

function ProviderPage() {
  const snap = useLedger();
  const active = snap.entitlements.filter((e) => e.status === "ACTIVE").length;
  const transferred = snap.provisions.filter((p) => p.action === "transfer").length;
  const recovered = snap.listings.reduce((n, l) => n + (l.unit === "days" ? l.duration : 0), 0);
  const listed = snap.entitlements.filter((e) => e.status === "LISTED").length;

  const stats = [
    { k: "Active entitlements", v: String(active) },
    { k: "Transferred entitlements", v: String(transferred) },
    { k: "Marketplace volume", v: formatEthDisplay(snap.volumeEth) },
    { k: "Provider revenue", v: formatEthDisplay(snap.providerRevenueEth) },
    { k: "Unused service recovered", v: `${recovered.toLocaleString()} days` },
    { k: "Currently locked", v: String(listed) },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <Reveal>
        <PageIntro kicker="Mock provider" title="Recovered time, as revenue.">
          Why a service would plug in: unused days come back as a share instead of vanishing when a
          subscriber leaves early. Demo catalog only.
        </PageIntro>
      </Reveal>

      <div className="mt-12 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal key={s.k} delay={i * 40}>
            <article className="bg-bg p-6">
              <p className="meta">{s.k}</p>
              <p className="font-display mt-4 text-4xl leading-none">{s.v}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        <Reveal>
          <article className="border border-line bg-surface p-6">
            <p className="meta">Fee split</p>
            <h2 className="font-display mt-2 text-4xl">On every resale</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex justify-between border-b border-line pb-2">
                <span className="text-muted">Seller</span>
                <span>90%</span>
              </li>
              <li className="flex justify-between border-b border-line pb-2">
                <span className="text-muted">Provider</span>
                <span>5%</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted">Platform</span>
                <span>5%</span>
              </li>
            </ul>
          </article>
        </Reveal>
        <Reveal delay={60}>
          <article className="border border-line bg-surface p-6 lg:col-span-2">
            <p className="meta">Why plug in</p>
            <h2 className="font-display mt-2 text-4xl">Unused time is recovered, not lost.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              When Alice lists leftover days, the mock provider revokes her access. When Bob buys,
              the adapter grants him the remaining window. Providers earn a 5% share of resale volume
              instead of writing off churned inventory.
            </p>
          </article>
        </Reveal>
      </div>

      <div className="mt-16">
        <p className="meta">Adapter log</p>
        <h2 className="font-display mt-2 text-4xl">Provisioning</h2>
        {snap.provisions.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No adapter events yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {snap.provisions.slice(0, 16).map((p) => {
              const s = getService(p.serviceId);
              return (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm">{s?.name ?? p.serviceId}</p>
                    <p className="meta mt-1">
                      {p.action} · {unitLabel(p.unit, p.duration)} · {shortAddress(p.owner)}
                    </p>
                  </div>
                  <p className="meta text-faint">Token #{p.tokenId}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
