import { ledger } from "@/lib/chain/ledger";
import { CONTRACTS } from "@/lib/contracts/addresses";
import { shortAddress } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg-deep">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="font-display text-6xl leading-none text-fg md:text-7xl">
              Split<span className="text-hot">X</span>
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              Don’t pay for what you don’t need. Don’t waste what you don’t use.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-muted md:col-span-3">
            <p className="meta mb-1">Navigate</p>
            <Link to="/marketplace" className="hover:text-fg">
              Marketplace
            </Link>
            <Link to="/buy" className="hover:text-fg">
              Buy access
            </Link>
            <Link to="/how-it-works" className="hover:text-fg">
              Protocol
            </Link>
            <Link to="/provider" className="hover:text-fg">
              Provider
            </Link>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-faint md:col-span-3">
            <p className="meta text-muted">Network</p>
            <p>Arbitrum Sepolia · Chain 421614</p>
            <p>Payment in ETH</p>
            <p>
              Entitlement {shortAddress(CONTRACTS.SplitXEntitlement, 3)} · Marketplace{" "}
              {shortAddress(CONTRACTS.SplitXMarketplace, 3)}
            </p>
            <p>Catalog uses mock providers. Not affiliated with named consumer brands.</p>
            <button type="button" className="pill mt-3" onClick={() => ledger.reset()}>
              Reset demo ledger
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
