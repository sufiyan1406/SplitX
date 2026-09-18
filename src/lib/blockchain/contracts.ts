import type { Abi } from "viem";
import sharedAddresses from "../../../../shared/integration/contract-addresses.json";
import entitlementAbiJson from "../../../../shared/integration/abis/SplitXEntitlement.json";
import marketplaceAbiJson from "../../../../shared/integration/abis/SplitXMarketplace.json";
import providerAbiJson from "../../../../shared/integration/abis/MockProviderAdapter.json";

export const entitlementAbi = entitlementAbiJson as Abi;
export const marketplaceAbi = marketplaceAbiJson as Abi;
export const providerAbi = providerAbiJson as Abi;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type AddressConfig = {
  chainId?: number;
  chainName?: string;
  deploymentTimestamp?: string;
  SplitXEntitlement?: string;
  SplitXMarketplace?: string;
  MockProviderAdapter?: string;
  contracts?: {
    SplitXEntitlement?: string;
    SplitXMarketplace?: string;
    MockProviderAdapter?: string;
  };
};

const addresses = sharedAddresses as AddressConfig;

const rawEntitlement = addresses.SplitXEntitlement ?? addresses.contracts?.SplitXEntitlement ?? ZERO_ADDRESS;
const rawMarketplace = addresses.SplitXMarketplace ?? addresses.contracts?.SplitXMarketplace ?? ZERO_ADDRESS;
const rawProvider = addresses.MockProviderAdapter ?? addresses.contracts?.MockProviderAdapter ?? ZERO_ADDRESS;

export const CONTRACT_ADDRESSES = {
  SplitXEntitlement: (rawEntitlement || ZERO_ADDRESS) as `0x${string}`,
  SplitXMarketplace: (rawMarketplace || ZERO_ADDRESS) as `0x${string}`,
  MockProviderAdapter: (rawProvider || ZERO_ADDRESS) as `0x${string}`,
};

export function isLiveMode(): boolean {
  const addr = CONTRACT_ADDRESSES.SplitXEntitlement;
  return Boolean(addr && addr !== ZERO_ADDRESS && !/^0x0+$/.test(addr));
}
