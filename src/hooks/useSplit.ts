import { ledger } from "@/lib/chain/ledger";

export function useSplit() {
  return { splitEntitlement: ledger.splitEntitlement };
}
