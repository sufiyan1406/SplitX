import { CHAIN_NAME } from "@/lib/catalog";
import { formatEthDisplay } from "@/lib/eth";
import { useWallet } from "@/hooks/use-wallet";
import { cn, shortAddress } from "@/lib/utils";
import { ChevronDown, Unplug, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  return (
    <div ref={wrap} className="relative flex items-center gap-2">
      <span
        className={cn(
          "meta hidden items-center gap-2 rounded-xs border px-3 py-2 sm:inline-flex",
          wrong ? "border-danger text-danger" : "border-line text-muted",
        )}
      >
        <span className={cn("size-1.5 rounded-full", wrong ? "bg-danger" : "bg-ok")} aria-hidden />
        {wrong ? "Wrong network" : "Arb Sepolia"}
      </span>

      <button type="button" className="pill pill-solid gap-2" onClick={() => setOpen((v) => !v)}>
        <Wallet className="size-3.5" />
        {w.connected
          ? `${w.account?.kind === "demo" ? `${w.account.label.replace("Demo Wallet ", "")} · ` : ""}${shortAddress(w.connected.address)}`
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
              <p className="meta">Switch account</p>
              {w.demo.map((d) => (
                <button
                  key={d.address}
                  type="button"
                  className="pill w-full justify-between"
                  onClick={() => {
                    void w.connectDemo(d.address);
                    setOpen(false);
                  }}
                >
                  <span>{d.label}</span>
                  <span className="font-mono normal-case tracking-normal">{formatEthDisplay(d.balanceEth)}</span>
                </button>
              ))}
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
              <p className="meta pt-2">Demo wallets</p>
              <p className="text-xs leading-relaxed text-faint">
                Use A as seller and B as buyer to run the full unused-time loop.
              </p>
              {w.demo.map((d) => (
                <button
                  key={d.address}
                  type="button"
                  className="pill w-full justify-between"
                  onClick={() => {
                    void w.connectDemo(d.address);
                    setOpen(false);
                  }}
                >
                  <span>{d.label}</span>
                  <span className="font-mono normal-case tracking-normal">{shortAddress(d.address)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
