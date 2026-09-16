import { ledger } from "@/lib/chain/ledger";

export function useListing() {
  return {
    approveAndList: ledger.approveAndList,
    cancelListing: ledger.cancelListing,
  };
}
