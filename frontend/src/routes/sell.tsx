import { PageIntro } from "@/components/layout/page-intro";
import { Magnetic, Reveal } from "@/components/motion";
import { showServiceTokenToast } from "@/components/toast/service-token-toast";
import { useTx } from "@/components/tx/tx-context";
import { NeedWallet } from "@/components/wallet/need-wallet";
import { useWallet } from "@/hooks/use-wallet";
import { getService, unitLabel } from "@/lib/catalog";
import { ledger, useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { useAppMode } from "@/lib/mode-context";
import { shortAddress } from "@/lib/utils";
import type { Listing, Service } from "@/types/splitx";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Globe, Lock, ShoppingCart, XCircle } from "lucide-react";

export const Route = createFileRoute("/sell")({ component: SellIndex });

function SellIndex() {
  const snap = useLedger();
  const w = useWallet();
  const { mode, setMode } = useAppMode();
  const tx = useTx();
  const nav = useNavigate();

  // Show ONLY the assets which the user has listed themselves
  const myListings = snap.listings.filter(
    (l) =>
      l.active &&
      w.connected &&
      l.seller.toLowerCase() === w.connected.address.toLowerCase()
  );

  function cancel(l: Listing, svc: Service) {
    tx.start({
      title: "Cancel listing",
      kindLabel: "Cancel Listing",
      fields: [
        { label: "Token", value: `#${l.tokenId}` },
        { label: "Service", value: svc.name },
      ],
      warning: "Your listed entitlement will be unlocked and returned to your active inventory.",
      run: async (reportStage) => {
        const res = await ledger.cancelListing(l.tokenId, reportStage);
        return { hash: res.tx.hash, tokenId: l.tokenId };
      },
    });
  }

  function buy(l: Listing, svc: Service) {
    tx.start({
      title: "Confirm purchase",
      kindLabel: "Marketplace buy",
      fields: [
        { label: "Service", value: svc.name },
        { label: "Duration", value: unitLabel(l.unit, l.duration) },
        { label: "Price", value: formatEthDisplay(l.priceEth) },
        { label: "Seller", value: shortAddress(l.seller, 6) },
        { label: "Token", value: `#${l.tokenId}` },
      ],
      run: async (reportStage) => {
        const res = await ledger.buyListing(l.tokenId, reportStage);
        return { hash: res.tx.hash, tokenId: l.tokenId };
      },
      onSuccess: (r) => {
        showServiceTokenToast({
          serviceId: svc.id,
          duration: l.duration,
          unit: l.unit,
          tokenId: r.tokenId ?? l.tokenId,
        });
        if (r.tokenId) void nav({ to: "/assets/$tokenId", params: { tokenId: String(r.tokenId) } });
      },
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <Reveal>
        <PageIntro kicker="Secondary Market" title="My Listings.">
          Active subscription days you have put up for sale on the marketplace. Only your listed assets appear here.
        </PageIntro>
      </Reveal>

      {/* Mode Status Banner */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-line/80 bg-surface/40 p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          {mode === "buyer" ? (
            <span className="flex size-7 items-center justify-center bg-hot/15 text-hot">
              <ShoppingCart className="size-3.5" />
            </span>
          ) : (
            <span className="flex size-7 items-center justify-center bg-muted/15 text-muted">
              <Globe className="size-3.5" />
            </span>
          )}
          <div>
            <p className="text-xs font-semibold text-fg">
              {mode === "buyer"
                ? "Buyer Mode Active · Ready to purchase"
                : "Browser Mode Active"}
            </p>
            <p className="text-[11px] text-muted">
              {mode === "buyer"
                ? "You can purchase listed items with your connected balance."
                : "To buy items from this listings page, switching to BUYER mode is mandatory."}
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

      <div className="mt-10">
        <NeedWallet title="Connect to view your listings">
          {myListings.length === 0 ? (
            <div className="border border-line bg-surface p-8 sm:p-10">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center bg-line/40 text-muted">
                  <ShoppingCart className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-3xl">No Active Listings</h2>
                  <p className="meta text-muted">You have not listed any unused time yet</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted max-w-xl">
                Unlisted subscriptions stay in your private <strong>Assets</strong> inventory.
                To list an entitlement on the marketplace, open any subscription in your Assets and click
                <strong> "Sell unused time"</strong>.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/assets" className="pill pill-solid flex items-center gap-2">
                  <span>Go to Assets Inventory</span>
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link to="/marketplace" className="pill">
                  View Marketplace
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {myListings.map((l, i) => {
                const svc = getService(l.serviceId);
                if (!svc) return null;

                return (
                  <Reveal key={l.tokenId} delay={i * 40}>
                    <article className="group flex h-full flex-col overflow-hidden border border-line bg-surface transition-[box-shadow] duration-200 hover:[box-shadow:var(--shadow-border-hover)]">
                      <div className="duotone aspect-4/3 overflow-hidden">
                        <img
                          src={svc.image}
                          alt=""
                          className="transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="meta">{svc.category}</p>
                          <span className="meta border border-hot/40 px-2 py-0.5 text-hot">
                            Token #{l.tokenId} · Listed
                          </span>
                        </div>

                        <h3 className="mt-2 text-lg font-medium leading-snug text-fg">{svc.name}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {unitLabel(l.unit, l.duration)} listed on marketplace
                        </p>

                        <div className="mt-4 flex items-baseline justify-between border-t border-line/60 pt-3">
                          <span className="meta">Listing Price</span>
                          <span className="text-xl font-bold tabular-nums text-fg">
                            {formatEthDisplay(l.priceEth)}
                          </span>
                        </div>

                        <div className="mt-auto space-y-2 pt-6">
                          {/* Mandatory Buyer Mode check for Buy action */}
                          {mode === "buyer" ? (
                            <Magnetic>
                              <button
                                type="button"
                                className="pill pill-solid w-full"
                                onClick={() => buy(l, svc)}
                              >
                                <ShoppingCart className="mr-1.5 size-3.5 inline" />
                                Buy This Listing ({formatEthDisplay(l.priceEth)})
                              </button>
                            </Magnetic>
                          ) : (
                            <div className="space-y-1">
                              <button
                                type="button"
                                className="pill pill-solid w-full"
                                onClick={() => setMode("buyer")}
                              >
                                <Lock className="mr-1.5 size-3.5 inline" />
                                Switch to BUYER Mode to Purchase
                              </button>
                              <p className="text-center font-mono text-[10px] text-muted">
                                Mandatory: Switch to BUYER mode to purchase this listing
                              </p>
                            </div>
                          )}

                          {/* Cancel Listing Button */}
                          <button
                            type="button"
                            className="pill w-full text-danger hover:border-danger hover:text-danger"
                            onClick={() => cancel(l, svc)}
                          >
                            <XCircle className="mr-1.5 size-3.5 inline" />
                            Cancel Listing
                          </button>

                          <div className="pt-1 text-center">
                            <Link
                              to="/assets/$tokenId"
                              params={{ tokenId: String(l.tokenId) }}
                              className="meta hover:text-fg underline text-[11px]"
                            >
                              Manage in Asset Inventory →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}
        </NeedWallet>
      </div>
    </main>
  );
}
