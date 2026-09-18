import { WalletMenu } from "@/components/wallet/wallet-menu";
import { CHAIN_NAME } from "@/lib/catalog";
import { useWallet } from "@/hooks/use-wallet";
import type { ReactNode } from "react";

export function NeedWallet({ children, title }: { children: ReactNode; title?: string }) {
  const w = useWallet();

  if (!w.connected) {
    return (
      <div className="border border-line bg-surface p-8">
        <p className="meta">Wallet required</p>
        <h2 className="font-display mt-2 text-4xl">{title ?? "Connect to continue"}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Connect MetaMask on Arbitrum Sepolia, or use the Demo Wallet to explore the full buy → list →
           resale loop.
        </p>
        <div className="mt-6">
          <WalletMenu />
        </div>
      </div>
    );
  }

  if (w.wrongChain) {
    return (
      <div className="border border-line bg-surface p-8">
        <p className="meta text-danger">Wrong network</p>
        <h2 className="font-display mt-2 text-4xl">Switch to {CHAIN_NAME}</h2>
        <button type="button" className="pill pill-solid mt-6" onClick={() => void w.switchNetwork()}>
          Switch network
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
