import { Reveal } from "@/components/motion";
import { getService, unitLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { Entitlement } from "@/types/splitx";
import { Link } from "@tanstack/react-router";

export function AssetCard({ asset, delay = 0 }: { asset: Entitlement; delay?: number }) {
  const service = getService(asset.serviceId);
  if (!service) return null;
  const total = Math.max(asset.originalDuration, 1);
  const usedPct = Math.min(100, (asset.usedDuration / total) * 100);
  const locked = asset.status === "LISTED" || asset.status === "LOCKED";

  return (
    <Reveal delay={delay}>
      <article className="overflow-hidden border border-line bg-surface">
        <div className="duotone h-40">
          <img src={service.image} alt="" />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="meta">Token #{asset.tokenId}</p>
            <span
              className={cn(
                "meta rounded-xs border px-3 py-1",
                asset.status === "ACTIVE" && "border-ok text-ok",
                locked && "border-warn text-warn",
                asset.status === "EXPIRED" && "border-danger text-danger",
              )}
            >
              {locked ? "Listed" : asset.status}
            </span>
          </div>
          <h3 className="text-lg font-medium leading-snug">{service.name}</h3>
          {locked && <p className="text-sm text-warn">Locked in SplitX</p>}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="text-sm text-muted">
            {unitLabel(asset.unit, asset.usedDuration)} used · {unitLabel(asset.unit, asset.remainingDuration)} remaining
          </p>
          <div className="flex gap-2 pt-1">
            <Link to="/assets/$tokenId" params={{ tokenId: String(asset.tokenId) }} className="pill flex-1">
              View
            </Link>
            {asset.status === "ACTIVE" && asset.remainingDuration > 0 && (
              <Link
                to="/sell/$tokenId"
                params={{ tokenId: String(asset.tokenId) }}
                className="pill pill-solid flex-1"
              >
                Sell unused
              </Link>
            )}
          </div>
        </div>
      </article>
    </Reveal>
  );
}
