import { useTx } from "@/components/tx/tx-context";
import { arbiscanTx, cn } from "@/lib/utils";
import type { TxStatus } from "@/types/splitx";
import { Check, Loader2, X } from "lucide-react";

const STEPS: { key: TxStatus; label: string }[] = [
  { key: "preparing", label: "Preparing" },
  { key: "waiting", label: "Waiting for wallet" },
  { key: "submitted", label: "Transaction submitted" },
  { key: "confirming", label: "Confirming" },
  { key: "provisioning", label: "Provider processing" },
  { key: "success", label: "Success" },
];

function stepState(current: TxStatus, key: TxStatus): "done" | "run" | "todo" {
  if (current === "failed" || current === "idle") return "todo";
  const order = STEPS.map((s) => s.key);
  const i = order.indexOf(current);
  const j = order.indexOf(key);
  if (current === "success") return "done";
  if (j < i) return "done";
  if (j === i) return "run";
  return "todo";
}

export function TxOverlay() {
  const tx = useTx();
  if (!tx.open || !tx.request) return null;

  const running = !["idle", "success", "failed"].includes(tx.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg-deep/80 p-3 sm:items-center">
      <div className="relative w-full max-w-lg border border-line bg-surface p-5 sm:p-7">
        <button
          type="button"
          className="absolute right-4 top-4 pill px-3 py-2"
          onClick={tx.close}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <p className="meta">{tx.request.kindLabel}</p>
        <h2 className="font-display mt-2 text-4xl text-fg">{tx.request.title}</h2>

        <dl className="mt-6 space-y-3">
          {tx.request.fields.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <dt className="meta">{f.label}</dt>
              <dd className="text-right text-sm text-fg">{f.value}</dd>
            </div>
          ))}
        </dl>

        {tx.request.warning && tx.status === "idle" && (
          <p className="mt-4 text-sm leading-relaxed text-warn">{tx.request.warning}</p>
        )}

        {tx.status === "idle" && (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="pill pill-solid flex-1" onClick={() => void tx.confirm()}>
              Confirm
            </button>
            <button type="button" className="pill flex-1" onClick={tx.close}>
              Cancel
            </button>
          </div>
        )}

        {tx.status !== "idle" && (
          <ol className="mt-6 space-y-3">
            {STEPS.map((s) => {
              const st = stepState(tx.status, s.key);
              const label =
                s.key === "provisioning"
                  ? tx.status === "provisioning"
                    ? "Transferring entitlement to provider..."
                    : tx.status === "success"
                      ? "Provider entitlement updated"
                      : s.label
                  : s.key === "success" && tx.status === "success"
                    ? "Entitlement is now yours."
                    : s.label;
              return (
                <li key={s.key} className="tx-step">
                  <span
                    className={cn(
                      "tx-dot",
                      st === "done" && "tx-dot-on",
                      st === "run" && "tx-dot-run",
                    )}
                  />
                  <span className={cn("text-sm", st === "todo" ? "text-faint" : "text-fg")}>
                    {st === "run" && <Loader2 className="mr-2 inline size-3.5 animate-spin" />}
                    {st === "done" && s.key === "success" && <Check className="mr-2 inline size-3.5" />}
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {running && (
          <button type="button" className="pill mt-5 w-full" onClick={tx.reject}>
            Reject in wallet
          </button>
        )}

        {tx.result?.hash && tx.status !== "idle" && (
          <a
            className="meta mt-5 inline-flex text-accent hover:text-fg"
            href={arbiscanTx(tx.result.hash)}
            target="_blank"
            rel="noreferrer"
          >
            View on Arbiscan · {tx.result.hash.slice(0, 10)}…
          </a>
        )}

        {tx.status === "failed" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-danger">{tx.error}</p>
            <button type="button" className="pill w-full" onClick={tx.close}>
              Close
            </button>
          </div>
        )}

        {tx.status === "success" && (
          <button type="button" className="pill pill-solid mt-6 w-full" onClick={tx.close}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}
