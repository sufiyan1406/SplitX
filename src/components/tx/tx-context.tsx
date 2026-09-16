import { humanError } from "@/lib/chain/ledger";
import type { TxStatus } from "@/types/splitx";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type TxField = { label: string; value: string };

export type TxRunResult = {
  hash: string;
  tokenId?: number;
  message?: string;
};

export type TxRequest = {
  title: string;
  kindLabel: string;
  fields: TxField[];
  warning?: string;
  run: () => Promise<TxRunResult>;
  onSuccess?: (result: TxRunResult) => void;
};

type TxContextValue = {
  open: boolean;
  status: TxStatus;
  request: TxRequest | null;
  result: TxRunResult | null;
  error: string | null;
  start: (req: TxRequest) => void;
  confirm: () => Promise<void>;
  reject: () => void;
  close: () => void;
};

const TxContext = createContext<TxContextValue | null>(null);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function TxProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TxStatus>("idle");
  const [request, setRequest] = useState<TxRequest | null>(null);
  const [result, setResult] = useState<TxRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rejectRef = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setStatus("idle");
    setRequest(null);
    setResult(null);
    setError(null);
    rejectRef.current = false;
  }, []);

  const start = useCallback((req: TxRequest) => {
    rejectRef.current = false;
    setRequest(req);
    setResult(null);
    setError(null);
    setStatus("idle");
    setOpen(true);
  }, []);

  const reject = useCallback(() => {
    rejectRef.current = true;
    setStatus("failed");
    setError("Transaction rejected in wallet.");
  }, []);

  const confirm = useCallback(async () => {
    if (!request) return;
    rejectRef.current = false;
    try {
      setStatus("preparing");
      await wait(380);
      if (rejectRef.current) return;
      setStatus("waiting");
      await wait(720);
      if (rejectRef.current) return;
      const res = await request.run();
      if (rejectRef.current) return;
      setResult(res);
      setStatus("submitted");
      await wait(520);
      if (rejectRef.current) return;
      setStatus("confirming");
      await wait(780);
      if (rejectRef.current) return;
      setStatus("provisioning");
      await wait(920);
      if (rejectRef.current) return;
      setStatus("success");
      request.onSuccess?.(res);
    } catch (err) {
      setStatus("failed");
      setError(humanError(err));
    }
  }, [request]);

  const value = useMemo(
    () => ({ open, status, request, result, error, start, confirm, reject, close }),
    [open, status, request, result, error, start, confirm, reject, close],
  );

  return <TxContext.Provider value={value}>{children}</TxContext.Provider>;
}

export function useTx() {
  const ctx = useContext(TxContext);
  if (!ctx) throw new Error("useTx must be used inside TxProvider");
  return ctx;
}
