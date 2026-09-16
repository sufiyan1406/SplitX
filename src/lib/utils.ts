import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(addr: string, size = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function arbiscanTx(hash: string) {
  return `https://sepolia.arbiscan.io/tx/${hash}`;
}

export function arbiscanAddress(addr: string) {
  return `https://sepolia.arbiscan.io/address/${addr}`;
}

export function arbiscanToken(contract: string, tokenId: number) {
  return `https://sepolia.arbiscan.io/token/${contract}?a=${tokenId}`;
}

export function daysFromMs(ms: number) {
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
