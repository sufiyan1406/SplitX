import { Magnetic, Reveal } from "@/components/motion";
import { useTx } from "@/components/tx/tx-context";
import { NeedWallet } from "@/components/wallet/need-wallet";
import { useWallet } from "@/hooks/use-wallet";
import {
  getService,
  quoteResaleSuggest,
  sellDurationOptions,
  splitProceeds,
  unitLabel,
} from "@/lib/catalog";
import { ledger, useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/sell_/$tokenId")({ component: SellFlow });

function SellFlow() {
  const { tokenId } = Route.useParams();
  const id = Number(tokenId);
  const snap = useLedger();
  const w = useWallet();
  const tx = useTx();
  const nav = useNavigate();
  const asset = snap.entitlements.find((e) => e.tokenId === id);
  const service = asset ? getService(asset.serviceId) : undefined;
  const opts = asset ? sellDurationOptions(asset.unit, asset.remainingDuration) : [];
  const [duration, setDuration] = useState(opts.at(-1) ?? 1);
  const [price, setPrice] = useState("");

  const suggested = useMemo(() => {
    if (!service || !asset) return "0";
    return quoteResaleSuggest(service, duration);
  }, [service, asset, duration]);

  const listPrice = price.trim() || suggested;
  const proceeds = splitProceeds(listPrice);
  const remainingAfter = asset ? asset.remainingDuration - duration : 0;
  const needsSplit = Boolean(asset && duration < asset.remainingDuration);

  if (!asset || !service) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-display">Asset not found</h1>
        <Link to="/sell" className="pill mt-6 inline-flex">
          Sell unused
        </Link>
      </main>
    );
  }

  const mine = w.connected && asset.owner.toLowerCase() === w.connected.address.toLowerCase();
  const blocked = asset.status !== "ACTIVE" || asset.remainingDuration <= 0;

  function lockAndList() {
    if (!asset || !service) return;
    tx.start({
      title: needsSplit ? "Split, approve & list" : "Approve & list",
      kindLabel: "Lock & List",
      fields: [
        { label: "Selling", value: unitLabel(asset.unit, duration) },
        { label: "Remaining after", value: unitLabel(asset.unit, remainingAfter) },
        { label: "List price", value: formatEthDisplay(listPrice) },
        { label: "Platform fee", value: `${formatEthDisplay(proceeds.platform)} (5%)` },
        { label: "Provider share", value: `${formatEthDisplay(proceeds.provider)} (5%)` },
        { label: "You receive", value: `${formatEthDisplay(proceeds.seller)} (90%)` },
      ],
      warning: "Once listed, this entitlement is locked and can no longer be used by you.",
      run: async (reportStage) => {
        let listId = asset.tokenId;
        if (needsSplit) {
          const split = await ledger.splitEntitlement(asset.tokenId, duration, reportStage);
          if (split.minted?.tokenId) {
            listId = split.minted.tokenId;
          }
        }
        const res = await ledger.approveAndList(listId, listPrice, reportStage);
        return { hash: res.tx.hash, tokenId: listId };
      },
      onSuccess: (r) => {
        if (r.tokenId) void nav({ to: "/listing/$tokenId", params: { tokenId: String(r.tokenId) } });
      },
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <Reveal>
        <p className="meta">Token #{asset.tokenId}</p>
        <h1 className="font-display mt-2 text-display leading-none">Sell unused time</h1>
        <p className="mt-3 text-muted">
          {service.name} · current remaining {unitLabel(asset.unit, asset.remainingDuration)}
        </p>
      </Reveal>

      <NeedWallet title="Connect to list">
        {!mine && <p className="mt-6 text-sm text-danger">You don't own this entitlement.</p>}
        {blocked && mine && (
          <p className="mt-6 text-sm text-warn">
            {asset.status === "LISTED"
              ? "Already listed and locked in SplitX."
              : "This entitlement cannot be sold."}
          </p>
        )}
        {mine && !blocked && (
          <div className="mt-8 space-y-8">
            <div>
              <p className="meta">How much do you want to sell?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {opts.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={cn("pill", d === duration && "pill-solid")}
                    onClick={() => setDuration(d)}
                  >
                    {unitLabel(asset.unit, d)}
                  </button>
                ))}
              </div>
            </div>

            {needsSplit && (
              <div className="border border-line bg-surface p-5 text-sm leading-relaxed text-muted">
                Split preview: original keeps {unitLabel(asset.unit, remainingAfter)}. New entitlement{" "}
                {unitLabel(asset.unit, duration)} is minted, then listed. The new token ID is assigned
                on-chain — never invented in the UI.
              </div>
            )}

            <div>
              <label className="meta" htmlFor="price">
                Listing price (ETH)
              </label>
              <input
                id="price"
                className="field mt-2"
                inputMode="decimal"
                placeholder={suggested}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="mt-2 text-xs text-faint">Suggested {formatEthDisplay(suggested)}</p>
            </div>

            <dl className="space-y-3">
              <Line k="You are selling" v={unitLabel(asset.unit, duration)} />
              <Line k="Remaining after sale" v={unitLabel(asset.unit, remainingAfter)} />
              <Line k="Expected listing price" v={formatEthDisplay(listPrice)} />
              <Line k="Platform fee" v="5%" />
              <Line k="Provider share" v="5%" />
              <Line k="Seller receives" v="90%" />
            </dl>

            <p className="text-sm text-warn">
              Once listed, this entitlement is locked and can no longer be used by you.
            </p>

            <Magnetic>
              <button type="button" className="pill pill-solid" onClick={lockAndList}>
                Lock & list
              </button>
            </Magnetic>
          </div>
        )}
      </NeedWallet>
    </main>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <dt className="meta">{k}</dt>
      <dd className="text-sm">{v}</dd>
    </div>
  );
}
