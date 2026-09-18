import { CONTRACT_ADDRESSES, isLiveMode } from "@/lib/blockchain/contracts";
import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/blockchain/client";

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

export function getContractAddress(name: ContractName): `0x${string}` {
  return CONTRACT_ADDRESSES[name];
}

export const CONTRACTS = CONTRACT_ADDRESSES;
export const NETWORK = "Arbitrum Sepolia";
export const CHAIN_ID_DEPLOYED = ARBITRUM_SEPOLIA_CHAIN_ID;
export { isLiveMode };
