import { Magnetic, Reveal } from "@/components/motion";
import { getService, unitLabel } from "@/lib/catalog";
import { useLedger } from "@/lib/chain/ledger";
import { formatEthDisplay } from "@/lib/eth";
import { cn, daysFromMs, shortAddress } from "@/lib/utils";
import type { Listing } from "@/types/splitx";
import { Link } from "@tanstack/react-router";

export function ListingCard({ listing, delay = 0 }: { listing: Listing; delay?: number }) {
  const service = getService(listing.serviceId);
  const snap = useLedger();
  const asset = snap.entitlements.find((e) => e.tokenId === listing.tokenId);
  if (!service) return null;
  const expDays = asset ? daysFromMs(asset.expiresAt - Date.now()) : 0;
  const expired = asset?.status === "EXPIRED" || expDays <= 0;

  return (
    <Reveal delay={delay}>
      <article className="group overflow-hidden border border-line bg-surface transition-[box-shadow] duration-200 hover:[box-shadow:var(--shadow-border-hover)]">
        <Link to="/listing/$tokenId" params={{ tokenId: String(listing.tokenId) }} className="block">
          <div className="duotone aspect-4/3">
            <img src={service.image} alt="" className="transition-transform duration-500 group-hover:scale-105" />
          </div>
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="meta">{service.category}</p>
              <p className="meta text-accent">Token #{listing.tokenId}</p>
            </div>
            <h3 className="text-lg font-medium leading-snug text-fg">{service.name}</h3>
            <p className="text-sm text-muted">{unitLabel(listing.unit, listing.duration)} remaining</p>
            <div className="flex items-end justify-between gap-3">
              <p className="text-xl tabular-nums text-fg">{formatEthDisplay(listing.priceEth)}</p>
              <p className="meta text-faint">Seller {shortAddress(listing.seller)}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={cn("meta rounded-xs border px-3 py-1", expired ? "border-danger text-danger" : "border-line")}>
                {expired ? "Expired" : listing.active ? "Active" : "Unavailable"}
              </span>
              <span className="meta text-faint">
                {expired ? "Cannot purchase" : `Expires in ${expDays} days`}
              </span>
            </div>
            <p className="meta">Mock provider · {service.provider}</p>
          </div>
        </Link>
        <div className="px-5 pb-5">
          <Magnetic>
            <Link
              to="/listing/$tokenId"
              params={{ tokenId: String(listing.tokenId) }}
              className={cn("pill w-full", expired ? "" : "pill-solid")}
            >
              {expired ? "Unavailable" : "Buy now"}
            </Link>
          </Magnetic>
        </div>
      </article>
    </Reveal>
  );
}
