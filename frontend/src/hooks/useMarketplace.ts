import { useLedger } from "@/lib/chain/ledger";

export function useMarketplace() {
  const snap = useLedger();
  return {
    listings: snap.listings,
    active: snap.listings.filter((l) => l.active),
    byToken: (tokenId: number) => snap.listings.find((l) => l.tokenId === tokenId),
  };
}
