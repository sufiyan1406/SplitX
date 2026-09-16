import { CHAIN_ID, CHAIN_NAME } from "@/lib/catalog";

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (ev: string, fn: (...args: unknown[]) => void) => void;
  removeListener?: (ev: string, fn: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eth;
  }
}

const CHAIN_HEX = "0x66eee";

export function hasInjectedWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function requestAccounts() {
  if (!window.ethereum) throw new Error("MetaMask not found. Use a demo wallet to continue.");
  const accs = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accs?.[0]) throw new Error("No account returned.");
  const chainHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  return { address: accs[0], chainId: Number.parseInt(chainHex, 16) };
}

export async function switchToArbitrumSepolia() {
  if (!window.ethereum) throw new Error("MetaMask not found.");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_HEX,
            chainName: CHAIN_NAME,
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
            blockExplorerUrls: ["https://sepolia.arbiscan.io"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
  return CHAIN_ID;
}

export function onInjectedAccountsChanged(fn: (address?: string) => void) {
  const eth = window.ethereum;
  if (!eth?.on) return () => {};
  const acc = (...args: unknown[]) => {
    const accounts = args[0] as string[] | undefined;
    fn(accounts?.[0]);
  };
  const chain = (...args: unknown[]) => {
    void args;
  };
  eth.on("accountsChanged", acc);
  eth.on("chainChanged", chain);
  return () => {
    eth.removeListener?.("accountsChanged", acc);
    eth.removeListener?.("chainChanged", chain);
  };
}
