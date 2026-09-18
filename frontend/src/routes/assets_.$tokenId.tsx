import { Reveal } from "@/components/motion";
import { generateServiceToken } from "@/components/toast/service-token-toast";
import { useTx } from "@/components/tx/tx-context";
import { NeedWallet } from "@/components/wallet/need-wallet";
import { useWallet } from "@/hooks/use-wallet";
import { getService, unitLabel } from "@/lib/catalog";
import { ledger, useLedger } from "@/lib/chain/ledger";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { formatEthDisplay } from "@/lib/eth";
import { arbiscanAddress, cn, daysFromMs, shortAddress } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/assets_/$tokenId")({ component: AssetDetail });

function AssetDetail() {
  const { tokenId } = Route.useParams();
  const id = Number(tokenId);
  const snap = useLedger();
  const w = useWallet();
  const tx = useTx();
  const [tokenCopied, setTokenCopied] = useState(false);
  const asset = snap.entitlements.find((e) => e.tokenId === id);
  const service = asset ? getService(asset.serviceId) : undefined;
  const listing = snap.listings.find((l) => l.tokenId === id && l.active);
  const lastTx = snap.txs.find((t) => t.tokenId === id);

  if (!asset || !service) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-display">Asset not found</h1>
        <Link to="/assets" className="pill mt-6 inline-flex">
          My assets
        </Link>
      </main>
    );
  }

  const current = asset;
  const svc = service;
  const locked = current.status === "LISTED" || current.status === "LOCKED";
  const expired = current.status === "EXPIRED";
  const mine = w.connected && current.owner.toLowerCase() === w.connected.address.toLowerCase();
  const total = Math.max(current.originalDuration, 1);
  const usedPct = Math.min(100, (current.usedDuration / total) * 100);
  const expDays = daysFromMs(current.expiresAt - Date.now());
  const expLabel = expired || expDays <= 0 ? "Expired" : `Expires in ${expDays} days`;
  const platformToken = generateServiceToken(service.id, asset.tokenId);

  const handleCopyToken = () => {
    void navigator.clipboard.writeText(platformToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2400);
  };

  function cancel() {
    tx.start({
      title: "Cancel listing",
      kindLabel: "Cancel Listing",
      fields: [
        { label: "Token", value: `#${current.tokenId}` },
        { label: "Service", value: svc.name },
      ],
      warning: "Your listed entitlement will be unlocked and returned to your active inventory.",
      run: async (reportStage) => {
        const res = await ledger.cancelListing(current.tokenId, reportStage);
        return { hash: res.tx.hash, tokenId: current.tokenId };
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
          <p className="meta">Token #{asset.tokenId}</p>
          <h1 className="font-display mt-2 text-display leading-none">{service.name}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={cn(
                "meta rounded-xs border px-3 py-1",
                asset.status === "ACTIVE" && "border-ok text-ok",
                locked && "border-warn text-warn",
                expired && "border-danger text-danger",
              )}
            >
              {locked ? "Listed" : asset.status}
            </span>
            <span className="meta rounded-xs border border-line px-3 py-1">{expLabel}</span>
          </div>
          {locked && (
            <p className="mt-3 text-sm text-warn">
              Locked in SplitX — cannot be used, split, or transferred.
            </p>
          )}

          <dl className="mt-6 space-y-3">
            <Row k="Original" v={unitLabel(asset.unit, asset.originalDuration)} />
            <Row k="Used" v={unitLabel(asset.unit, asset.usedDuration)} />
            <Row k="Remaining" v={unitLabel(asset.unit, asset.remainingDuration)} />
            <Row k="Owner" v={shortAddress(asset.owner, 6)} />
            <Row k="Contract" v={shortAddress(CONTRACTS.SplitXEntitlement, 4)} />
            <Row k="Network" v="Arbitrum Sepolia" />
            {listing && <Row k="List price" v={formatEthDisplay(listing.priceEth)} />}
          </dl>

          <div className="mt-6">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${usedPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {unitLabel(asset.unit, asset.usedDuration)} used · {unitLabel(asset.unit, asset.remainingDuration)} remaining
            </p>
          </div>

          {/* Active Platform Token Box */}
          <div className="mt-6 border border-line bg-surface/80 p-4">
            <div className="flex items-center justify-between">
              <span className="meta text-fg">Active Platform Access Token</span>
              <span className="font-mono text-[10px] text-ok">Valid · Provisioned</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              This is your {service.name} credential token to use on the platform.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 border border-line/90 bg-bg-deep p-2.5">
              <code className="font-mono text-xs font-semibold text-fg tracking-wide truncate selection:bg-hot">
                {platformToken}
              </code>
              <button
                type="button"
                onClick={handleCopyToken}
                className={cn(
                  "pill px-2.5 py-1 text-[11px] font-mono shrink-0 transition-all",
                  tokenCopied ? "bg-ok/20 border-ok text-ok" : "border-line hover:border-hot text-fg",
                )}
              >
                {tokenCopied ? "Copied!" : "Copy Token"}
              </button>
            </div>
          </div>

          <NeedWallet>
            {mine && (
              <div className="mt-6 flex flex-wrap gap-2">
                {asset.status === "ACTIVE" && !expired && (
                  <Link to="/sell/$tokenId" params={{ tokenId: String(asset.tokenId) }} className="pill pill-solid">
                    Sell unused time
                  </Link>
                )}
                {locked && (
                  <button type="button" className="pill" onClick={cancel}>
                    Cancel listing
                  </button>
                )}
                {asset.status === "ACTIVE" && !expired && asset.unit === "days" && (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => ledger.fastForward(asset.tokenId, Math.min(20, asset.remainingDuration))}
                  >
                    Simulate {Math.min(20, asset.remainingDuration)} days used
                  </button>
                )}
                {asset.status === "ACTIVE" && !expired && asset.unit === "credits" && (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => ledger.fastForward(asset.tokenId, Math.min(1000, asset.remainingDuration))}
                  >
                    Simulate usage
                  </button>
                )}
              </div>
            )}
          </NeedWallet>

          {lastTx && (
            <a
              className="meta mt-6 inline-block text-accent"
              href={`https://sepolia.arbiscan.io/tx/${lastTx.hash}`}
              target="_blank"
              rel="noreferrer"
            >
              Last tx {lastTx.hash.slice(0, 12)}… · View on Arbiscan
            </a>
          )}
          <a
            className="meta mt-2 block text-faint"
            href={arbiscanAddress(asset.owner)}
            target="_blank"
            rel="noreferrer"
          >
            Owner on Arbiscan
          </a>
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
