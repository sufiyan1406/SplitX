import addresses from "./json/contract-addresses.json";

export type ContractName = keyof typeof addresses.contracts;

export function getContractAddress(name: ContractName): `0x${string}` {
  return addresses.contracts[name] as `0x${string}`;
}

export const CONTRACTS = addresses.contracts;
export const NETWORK = addresses.network;
export const CHAIN_ID_DEPLOYED = addresses.chainId;
