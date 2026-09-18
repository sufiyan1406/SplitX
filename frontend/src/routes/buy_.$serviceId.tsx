import { Magnetic, Reveal } from "@/components/motion";
import { showServiceTokenToast } from "@/components/toast/service-token-toast";
import { useTx } from "@/components/tx/tx-context";
import { NeedWallet } from "@/components/wallet/need-wallet";
import {
  durationOptions,
  getService,
  quoteDirect,
  quotePrimary,
  quoteResaleSuggest,
  unitLabel,
} from "@/lib/catalog";
import { ledger, useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/buy_/$serviceId")({ component: ServicePage });

function ServicePage() {
  const { serviceId } = Route.useParams();
  const service = getService(serviceId);
  const snap = useLedger();
  const tx = useTx();
  const nav = useNavigate();
  const opts = service ? durationOptions(service.unit) : [];
  const [duration, setDuration] = useState(opts.includes(10) ? 10 : opts[0] ?? 1);

  const price = service ? quotePrimary(service, duration) : "0";
  const resale = useMemo(() => {
    if (!service) return undefined;
    const live = snap.listings.filter((l) => l.active && l.serviceId === service.id);
    if (!live.length) return quoteResaleSuggest(service, Math.min(duration, 10));
    const closest = [...live].sort(
      (a, b) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration),
    )[0];
    return closest;
  }, [service, snap.listings, duration]);

  if (!service) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="meta">Missing</p>
        <h1 className="font-display mt-2 text-display">Service not found</h1>
        <Link to="/buy" className="pill mt-6 inline-flex">
          Back to catalog
        </Link>
      </main>
    );
  }

  function buy() {
    if (!service) return;
    tx.start({
      title: `Buy ${unitLabel(service.unit, duration)}`,
      kindLabel: "Primary purchase",
      fields: [
        { label: "Service", value: service.name },
        { label: "Duration", value: unitLabel(service.unit, duration) },
        { label: "Price", value: formatEthDisplay(price) },
        { label: "Payment", value: "ETH · Arbitrum Sepolia" },
        { label: "Provider", value: `Mock Provider · ${service.provider}` },
      ],
      run: async (reportStage) => {
        const res = await ledger.purchasePrimary(service.id, duration, reportStage);
        return { hash: res.tx.hash, tokenId: res.tokenId };
      },
      onSuccess: (r) => {
        showServiceTokenToast({
          serviceId: service.id,
          duration,
          unit: service.unit,
          tokenId: r.tokenId,
        });
        if (r.tokenId) void nav({ to: "/assets/$tokenId", params: { tokenId: String(r.tokenId) } });
      },
    });
  }

  const resalePrice = typeof resale === "string" ? resale : resale?.priceEth;
  const resaleDur = typeof resale === "string" ? Math.min(duration, 10) : resale?.duration;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 md:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="duotone aspect-4/5 overflow-hidden md:aspect-4/3">
            <img src={service.image} alt="" />
          </div>
        </Reveal>
        <div>
          <p className="meta">{service.category}</p>
          <h1 className="font-display mt-2 text-display leading-none">{service.name}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">{service.blurb}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <dt className="meta">Provider</dt>
              <dd className="mt-1">{service.provider} · Mock</dd>
            </div>
            <div>
              <dt className="meta">Transferable</dt>
              <dd className="mt-1">Yes</dd>
            </div>
            <div>
              <dt className="meta">Resellable</dt>
              <dd className="mt-1">Yes</dd>
            </div>
            <div>
              <dt className="meta">Network</dt>
              <dd className="mt-1">Arbitrum Sepolia</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-faint">{service.expiryNote}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <ValueCard kicker="Direct" title={`${unitLabel(service.unit, service.packageDuration)}`} price={quoteDirect(service)} />
            <ValueCard
              kicker="SplitX primary"
              title={unitLabel(service.unit, duration)}
              price={price}
              active
            />
            <ValueCard
              kicker="Resale"
              title={resaleDur ? unitLabel(service.unit, resaleDur) : "—"}
              price={resalePrice ?? "—"}
            />
          </div>

          <div className="mt-8">
            <p className="meta">How long do you need access?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {opts.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={cn("pill", d === duration && "pill-solid")}
                  onClick={() => setDuration(d)}
                >
                  {unitLabel(service.unit, d)}
                </button>
              ))}
            </div>
            <p className="mt-5 text-2xl tabular-nums">{formatEthDisplay(price)}</p>
            <NeedWallet title="Connect to buy">
              <Magnetic>
                <button type="button" className="pill pill-solid mt-5" onClick={buy}>
                  Buy {unitLabel(service.unit, duration)}
                </button>
              </Magnetic>
            </NeedWallet>
          </div>
        </div>
      </div>
    </main>
  );
}

function ValueCard({
  kicker,
  title,
  price,
  active,
}: {
  kicker: string;
  title: string;
  price: string;
  active?: boolean;
}) {
  return (
    <div className={cn("border p-4", active ? "border-fg bg-surface-2" : "border-line bg-surface")}>
      <p className="meta">{kicker}</p>
      <p className="mt-2 text-sm">{title}</p>
      <p className="mt-1 tabular-nums">{price === "—" ? "—" : formatEthDisplay(price)}</p>
    </div>
  );
}
