import { Magnetic, Reveal } from "@/components/motion";
import { showServiceTokenToast } from "@/components/toast/service-token-toast";
import { useTx } from "@/components/tx/tx-context";
import { NeedWallet } from "@/components/wallet/need-wallet";
import { useWallet } from "@/hooks/use-wallet";
import { getService, unitLabel } from "@/lib/catalog";
import { ledger, useLedger } from "@/lib/chain/ledger";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { formatEthDisplay } from "@/lib/eth";
import { useAppMode } from "@/lib/mode-context";
import { shortAddress } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, ShoppingCart, XCircle } from "lucide-react";

export const Route = createFileRoute("/listing/$tokenId")({ component: ListingDetail });

function ListingDetail() {
  const { tokenId } = Route.useParams();
  const id = Number(tokenId);
  const snap = useLedger();
  const w = useWallet();
  const mode = useAppMode();
  const tx = useTx();
  const nav = useNavigate();
  const listing = snap.listings.find((l) => l.tokenId === id);
  const asset = snap.entitlements.find((e) => e.tokenId === id);
  const service = listing ? getService(listing.serviceId) : undefined;
  const expired = asset ? asset.status === "EXPIRED" || Date.now() >= asset.expiresAt : false;

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

  function cancel() {
    tx.start({
      title: "Cancel listing",
      kindLabel: "Cancel Listing",
      fields: [
        { label: "Token", value: `#${live.tokenId}` },
        { label: "Service", value: svc.name },
      ],
      warning: "Your listed entitlement will be unlocked and returned to your active inventory.",
      run: async (reportStage) => {
        const res = await ledger.cancelListing(live.tokenId, reportStage);
        return { hash: res.tx.hash, tokenId: live.tokenId };
      },
      onSuccess: () => {
        void nav({ to: "/sell" });
      },
    });
  }

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
      run: async (reportStage) => {
        const res = await ledger.buyListing(live.tokenId, reportStage);
        return { hash: res.tx.hash, tokenId: live.tokenId };
      },
      onSuccess: (r) => {
        showServiceTokenToast({
          serviceId: svc.id,
          duration: live.duration,
          unit: live.unit,
          tokenId: r.tokenId ?? live.tokenId,
        });
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
            {unitLabel(listing.unit, listing.duration)} remaining · Provider · {service.provider}
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
            <div className="mt-6 space-y-3">
              {!unavailable && !mine && (
                mode.mode === "buyer" ? (
                  <Magnetic>
                    <button type="button" className="pill pill-solid w-full" onClick={buy}>
                      Confirm purchase ({formatEthDisplay(live.priceEth)})
                    </button>
                  </Magnetic>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      className="pill pill-solid w-full"
                      onClick={() => mode.setMode("buyer")}
                    >
                      <Lock className="mr-1.5 size-3.5 inline" />
                      Switch to BUYER Mode to Purchase
                    </button>
                    <p className="font-mono text-[10px] text-muted text-center">
                      Mandatory: Switch to BUYER mode to purchase this entitlement with buyer balance
                    </p>
                  </div>
                )
              )}

              {mine && listing.active && (
                <div className="w-full space-y-3 border border-line bg-surface/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="meta text-hot">You are the seller of this listing</span>
                    <span className="font-mono text-xs text-muted">Seller Account</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    You listed these unused days. To test buying them as a customer on the marketplace,
                    switch to Buyer Mode.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {mode.mode === "buyer" ? (
                      <button
                        type="button"
                        className="pill pill-solid"
                        onClick={buy}
                      >
                        <ShoppingCart className="mr-1.5 size-3.5 inline" />
                        Buy This Listing ({formatEthDisplay(live.priceEth)})
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="pill pill-solid"
                        onClick={() => mode.setMode("buyer")}
                      >
                        <ShoppingCart className="mr-1.5 size-3.5 inline" />
                        Switch to Buyer Mode to Buy
                      </button>
                    )}

                    <button
                      type="button"
                      className="pill text-danger hover:border-danger hover:text-danger"
                      onClick={cancel}
                    >
                      <XCircle className="mr-1.5 size-3.5 inline" />
                      Cancel Listing
                    </button>
                    <Link to="/assets/$tokenId" params={{ tokenId: String(id) }} className="pill">
                      Manage asset
                    </Link>
                  </div>
                </div>
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
