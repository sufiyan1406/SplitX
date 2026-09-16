import type { Abi } from "viem";
import entitlement from "./json/SplitXEntitlement.json";
import marketplace from "./json/SplitXMarketplace.json";
import provider from "./json/MockProviderAdapter.json";

export const entitlementAbi = entitlement as Abi;
export const marketplaceAbi = marketplace as Abi;
export const providerAbi = provider as Abi;
