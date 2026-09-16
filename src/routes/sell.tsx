import { AssetCard } from "@/components/assets/asset-card";
import { PageIntro } from "@/components/layout/page-intro";
import { Reveal } from "@/components/motion";
import { NeedWallet } from "@/components/wallet/need-wallet";
import { useWallet } from "@/hooks/use-wallet";
import { useLedger } from "@/lib/chain/ledger";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sell")({ component: SellIndex });

function SellIndex() {
  const snap = useLedger();
  const w = useWallet();
  const mine = snap.entitlements.filter(
    (e) =>
      w.connected &&
      e.owner.toLowerCase() === w.connected.address.toLowerCase() &&
      e.status === "ACTIVE" &&
      e.remainingDuration > 0,
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <Reveal>
        <PageIntro kicker="Secondary" title="Sell the days you won’t use.">
          Lock remaining time into SplitX, list it, and let someone else finish the window.
        </PageIntro>
      </Reveal>
      <div className="mt-12">
        <NeedWallet title="Connect to sell unused time">
          {mine.length === 0 ? (
            <div className="border border-line bg-surface p-8">
              <h2 className="font-display text-4xl">Nothing to list</h2>
              <p className="mt-3 text-sm text-muted">
                Buy access first, simulate usage if you want a leftover window, then sell the rest.
              </p>
              <Link to="/buy" className="pill pill-solid mt-6 inline-flex">
                Buy access
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((a, i) => (
                <AssetCard key={a.tokenId} asset={a} delay={i * 40} />
              ))}
            </div>
          )}
        </NeedWallet>
      </div>
    </main>
  );
}
