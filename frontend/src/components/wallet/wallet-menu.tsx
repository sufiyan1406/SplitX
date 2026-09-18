import { CHAIN_NAME, DEMO_WALLETS } from "@/lib/catalog";
import { formatEthDisplay } from "@/lib/eth";
import { useWallet } from "@/hooks/use-wallet";
import { cn, shortAddress } from "@/lib/utils";
import { ChevronDown, Unplug, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { isLiveMode } from "@/lib/blockchain/contracts";

export function WalletMenu() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const wrong = w.wrongChain;
  const live = isLiveMode();

  return (
    <div ref={wrap} className="relative flex items-center gap-2">
      <button type="button" className="pill pill-solid gap-2" onClick={() => setOpen((v) => !v)}>
        <Wallet className="size-3.5" />
        {w.connected
          ? shortAddress(w.connected.address)
          : "Connect"}
        <ChevronDown className="size-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[min(22rem,calc(100vw-2rem))] border border-line bg-surface p-3 shadow-[var(--shadow-border)]">
          {w.connected ? (
            <div className="space-y-3 p-2">
              <div>
                <p className="meta">Connected</p>
                <p className="mt-1 font-mono text-sm text-fg">{shortAddress(w.connected.address, 6)}</p>
                <p className="mt-1 text-sm text-muted">
                  {w.account ? formatEthDisplay(w.account.balanceEth) : "—"} · {w.account?.label ?? "Wallet"}
                </p>
              </div>
              {wrong && (
                <button type="button" className="pill w-full" onClick={() => w.switchNetwork()}>
                  Switch to {CHAIN_NAME}
                </button>
              )}
              <div className="hairline" />
              <button
                type="button"
                className="pill w-full"
                onClick={() => {
                  w.disconnect();
                  setOpen(false);
                }}
              >
                <Unplug className="size-3.5" />
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              <p className="meta mb-3">Connect</p>
              <button
                type="button"
                className="pill pill-solid w-full"
                onClick={() => {
                  void w.connectMetaMask().catch(() => {});
                }}
              >
                MetaMask
              </button>
              {w.error && <p className="text-xs text-danger">{w.error}</p>}
              <div className="hairline" />
              <p className="meta pt-2">Demo wallet</p>
              <p className="text-xs leading-relaxed text-faint">
                Use the demo wallet to explore the full buy → list → resale loop without MetaMask.
              </p>
              <button
                type="button"
                className="pill w-full justify-between"
                onClick={() => {
                  void w.connectDemo(DEMO_WALLETS[0].address);
                  setOpen(false);
                }}
              >
                <span>{DEMO_WALLETS[0].label}</span>
                <span className="font-mono normal-case tracking-normal">{shortAddress(DEMO_WALLETS[0].address)}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
