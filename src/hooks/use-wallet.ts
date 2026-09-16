import { DEMO_WALLETS } from "@/lib/catalog";
import { humanError, ledger, useLedger } from "@/lib/chain/ledger";
import { hasInjectedWallet, requestAccounts, switchToArbitrumSepolia } from "@/lib/wallet/injected";
import { useMemo, useState } from "react";

export function useWallet() {
  const snap = useLedger();
  const [error, setError] = useState<string | null>(null);
  const connected = snap.connected;
  const account = connected ? snap.wallets[connected.address.toLowerCase()] : undefined;
  const wrongChain = Boolean(connected && connected.chainId !== 421614);

  const demo = useMemo(
    () => DEMO_WALLETS.map((w) => snap.wallets[w.address.toLowerCase()] ?? w),
    [snap.wallets],
  );

  async function connectDemo(address: string) {
    setError(null);
    ledger.connectDemo(address);
  }

  async function connectMetaMask() {
    setError(null);
    try {
      if (!hasInjectedWallet()) {
        throw new Error("MetaMask not found. Use a demo wallet in this preview.");
      }
      const { address, chainId } = await requestAccounts();
      ledger.connectInjected(address, chainId);
    } catch (err) {
      setError(humanError(err));
      throw err;
    }
  }

  async function switchNetwork() {
    setError(null);
    try {
      const id = await switchToArbitrumSepolia();
      ledger.setChainId(id);
    } catch (err) {
      setError(humanError(err));
      throw err;
    }
  }

  return {
    connected,
    account,
    wrongChain,
    error,
    demo,
    connectDemo,
    connectMetaMask,
    switchNetwork,
    disconnect: () => ledger.disconnect(),
  };
}
