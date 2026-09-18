import { AssetCard } from "@/components/assets/asset-card";
import { PageIntro } from "@/components/layout/page-intro";
import { Reveal } from "@/components/motion";
import { NeedWallet } from "@/components/wallet/need-wallet";
import { useWallet } from "@/hooks/use-wallet";
import { getService } from "@/lib/catalog";
import { txKindLabel, useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { arbiscanTx, shortAddress } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/assets")({ component: AssetsPage });

function AssetsPage() {
  const snap = useLedger();
  const w = useWallet();

  const mine = snap.entitlements.filter(
    (e) => w.connected && e.owner.toLowerCase() === w.connected.address.toLowerCase(),
  );
  const myTxs = snap.txs.filter(
    (t) => w.connected && t.from.toLowerCase() === w.connected.address.toLowerCase(),
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <Reveal>
        <PageIntro kicker="Inventory" title="What you still hold.">
          NFTs you own. Listed tokens are locked in SplitX until cancelled or purchased.
        </PageIntro>
      </Reveal>
      <div className="mt-12">
        <NeedWallet title="Connect to view assets">
          {mine.length === 0 ? (
            <div className="border border-line bg-surface p-8">
              <h2 className="font-display text-4xl">No entitlements yet</h2>
              <p className="mt-3 text-sm text-muted">
                Buy a subscription or pick up discounted unused time on the marketplace to get started.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/marketplace" className="pill pill-solid">
                  Browse marketplace
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((a, i) => (
                <AssetCard key={a.tokenId} asset={a} delay={i * 40} />
              ))}
            </div>
          )}

          {myTxs.length > 0 && (
            <div className="mt-16">
              <p className="meta">On-chain activity</p>
              <h2 className="font-display mt-2 text-4xl">Your transactions</h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {myTxs.slice(0, 8).map((t) => {
                  const svc = t.tokenId
                    ? getService(snap.entitlements.find((e) => e.tokenId === t.tokenId)?.serviceId ?? "")
                    : undefined;
                  return (
                    <li key={t.hash} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                      <div>
                        <p className="text-sm">{t.label}</p>
                        <p className="meta mt-1">
                          {txKindLabel(t.kind)}
                          {svc ? ` · ${svc.name}` : ""}
                          {t.valueEth ? ` · ${formatEthDisplay(t.valueEth)}` : ""}
                        </p>
                      </div>
                      <a
                        className="meta text-accent"
                        href={arbiscanTx(t.hash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shortAddress(t.hash, 4)} · Arbiscan
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </NeedWallet>
      </div>
    </main>
  );
}
