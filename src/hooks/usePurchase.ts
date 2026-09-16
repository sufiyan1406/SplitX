import { ledger } from "@/lib/chain/ledger";

export function usePurchase() {
  return {
    buyPrimary: ledger.purchasePrimary,
    buyListing: ledger.buyListing,
  };
}
