import { formatEther, keccak256, parseEther, toHex } from "viem";

export function toWei(eth: string) {
  return parseEther(eth as `${number}`);
}

export function fromWei(wei: bigint) {
  return formatEther(wei);
}

export function addEth(a: string, b: string) {
  return fromWei(toWei(a) + toWei(b));
}

export function subEth(a: string, b: string) {
  const next = toWei(a) - toWei(b);
  if (next < 0n) throw new Error("Insufficient ETH on Arbitrum Sepolia.");
  return fromWei(next);
}

export function cmpEth(a: string, b: string) {
  const da = toWei(a);
  const db = toWei(b);
  if (da === db) return 0;
  return da > db ? 1 : -1;
}

export function makeTxHash(payload: unknown) {
  const bytes = toHex(JSON.stringify(payload));
  return keccak256(bytes);
}

export function formatEth(eth: string, digits = 4) {
  const n = Number(eth);
  if (!Number.isFinite(n)) return eth;
  return n.toFixed(digits).replace(/\.?0+$/, (m) => (m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m));
}

export function formatEthDisplay(eth: string) {
  const n = Number(eth);
  if (!Number.isFinite(n)) return `${eth} ETH`;
  if (n === 0) return "0 ETH";
  const digits = n < 0.001 ? 6 : 4;
  const trimmed = n.toFixed(digits).replace(/\.?0+$/, "");
  return `${trimmed} ETH`;
}
