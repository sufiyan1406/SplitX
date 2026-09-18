import { createPublicClient, createWalletClient, custom, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc";

export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
});

export function getInjectedWalletClient(accountAddress: string) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found in browser.");
  }
  return createWalletClient({
    account: accountAddress as `0x${string}`,
    chain: arbitrumSepolia,
    transport: custom(window.ethereum),
  });
}
