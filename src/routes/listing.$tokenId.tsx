import { Magnetic, Reveal } from "@/components/motion";
import { useTx } from "@/components/tx/tx-context";
import { NeedWallet } from "@/components/wallet/need-wallet";
import { useWallet } from "@/hooks/use-wallet";
import { getService, unitLabel } from "@/lib/catalog";
import { ledger, useLedger } from "@/lib/chain/ledger";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { formatEthDisplay } from "@/lib/eth";
import { shortAddress } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/listing/$tokenId")({ component: ListingPage });

function ListingPage() {
  const { tokenId } = Route.useParams();
  const id = Number(tokenId);
  const snap = useLedger();
  const w = useWallet();
  const tx = useTx();
  const nav = useNavigate();
  const listing = snap.listings.find((l) => l.tokenId === id);
  const asset = snap.entitlements.find((e) => e.tokenId === id);
  const service = listing ? getService(listing.serviceId) : undefined;
  const expired = asset?.status === "EXPIRED";

  if (!listing || !service || !asset) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-display">Listing not found</h1>
        <Link to="/marketplace" className="pill mt-6 inline-flex">
          Marketplace
        </Link>
      </main>
    );
  }

  const live = listing;
  const svc = service;
  const mine = w.connected && live.seller.toLowerCase() === w.connected.address.toLowerCase();
  const unavailable = !live.active || expired;

  function buy() {
    tx.start({
      title: "Confirm purchase",
      kindLabel: "Marketplace buy",
      fields: [
        { label: "Service", value: svc.name },
        { label: "Duration", value: unitLabel(live.unit, live.duration) },
        { label: "Price", value: formatEthDisplay(live.priceEth) },
        { label: "Seller", value: shortAddress(live.seller, 6) },
        { label: "You receive", value: `${unitLabel(live.unit, live.duration)} entitlement` },
        { label: "Token", value: `#${live.tokenId}` },
      ],
      run: async () => {
        const res = ledger.buyListing(live.tokenId);
        return { hash: res.tx.hash, tokenId: live.tokenId };
      },
      onSuccess: (r) => {
        if (r.tokenId) void nav({ to: "/assets/$tokenId", params: { tokenId: String(r.tokenId) } });
      },
    });
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 md:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="duotone aspect-4/3 overflow-hidden">
            <img src={service.image} alt="" />
          </div>
        </Reveal>
        <div>
          <p className="meta">Token #{listing.tokenId}</p>
          <h1 className="font-display mt-2 text-display leading-none">{service.name}</h1>
          <p className="mt-3 text-muted">
            {unitLabel(listing.unit, listing.duration)} remaining · Mock provider · {service.provider}
          </p>
          <p className="mt-6 text-3xl tabular-nums">{formatEthDisplay(listing.priceEth)}</p>

          <dl className="mt-6 space-y-3">
            <Row k="Seller" v={shortAddress(listing.seller, 6)} />
            <Row k="Status" v={unavailable ? "Unavailable" : "Active"} />
            <Row k="Owner" v={shortAddress(asset.owner, 6)} />
            <Row k="Contract" v={shortAddress(CONTRACTS.SplitXMarketplace, 4)} />
            <Row k="Network" v="Arbitrum Sepolia" />
          </dl>

          {unavailable && (
            <p className="mt-4 text-sm text-danger">
              {expired ? "This entitlement has expired." : "This listing is no longer available."}
            </p>
          )}

          <NeedWallet title="Connect to buy">
            <div className="mt-6 flex flex-wrap gap-2">
              {!unavailable && !mine && (
                <Magnetic>
                  <button type="button" className="pill pill-solid" onClick={buy}>
                    Confirm purchase
                  </button>
                </Magnetic>
              )}
              {mine && listing.active && (
                <Link to="/assets/$tokenId" params={{ tokenId: String(id) }} className="pill">
                  Manage listing
                </Link>
              )}
            </div>
          </NeedWallet>
        </div>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <dt className="meta">{k}</dt>
      <dd className="text-sm">{v}</dd>
    </div>
  );
}
