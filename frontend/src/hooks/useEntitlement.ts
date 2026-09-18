import { useLedger } from "@/lib/chain/ledger";

export function useEntitlement(tokenId?: number) {
  const snap = useLedger();
  const entitlement = tokenId == null ? undefined : snap.entitlements.find((e) => e.tokenId === tokenId);
  const owned = (address?: string) =>
    snap.entitlements.filter((e) => address && e.owner.toLowerCase() === address.toLowerCase());
  return { entitlement, owned, all: snap.entitlements };
}
