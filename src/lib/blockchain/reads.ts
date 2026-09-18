import { formatEther } from "viem";
import { getService } from "@/lib/catalog";
import type { Entitlement, EntitlementStatus, Listing } from "@/types/splitx";
import { publicClient } from "./client";
import { CONTRACT_ADDRESSES, entitlementAbi, marketplaceAbi, providerAbi } from "./contracts";

export function toContractServiceId(id: string): string {
  switch (id.toLowerCase()) {
    case "netflix":
      return "NETFLIX_PREMIUM";
    case "spotify":
      return "SPOTIFY_PREMIUM";
    case "ai-api":
      return "AI_API_CREDITS";
    case "nimbus":
    case "apex":
      return "CLOUD_STORAGE";
    default:
      return id.toUpperCase();
  }
}

export function toFrontendServiceId(contractServiceId: string): string {
  switch (contractServiceId) {
    case "NETFLIX_PREMIUM":
      return "netflix";
    case "SPOTIFY_PREMIUM":
      return "spotify";
    case "AI_API_CREDITS":
      return "ai-api";
    case "CLOUD_STORAGE":
      return "apex";
    default:
      return contractServiceId.toLowerCase();
  }
}

export function statusEnumToString(statusNum: number): EntitlementStatus {
  switch (statusNum) {
    case 0:
      return "ACTIVE";
    case 1:
      return "LISTED";
    case 2:
      return "LOCKED";
    case 3:
      return "EXPIRED";
    default:
      return "EXPIRED";
  }
}

export async function getRealEthBalance(address: string): Promise<string> {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return "0.0000";
  const wei = await publicClient.getBalance({ address: address as `0x${string}` });
  const eth = formatEther(wei);
  const num = Number.parseFloat(eth);
  return num.toFixed(4);
}

export async function getOnChainServicePrice(serviceId: string, durationDays: number): Promise<bigint> {
  const contractSvcId = toContractServiceId(serviceId);
  const price = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "getServicePrice",
    args: [contractSvcId, BigInt(durationDays)],
  })) as bigint;
  return price;
}

export type OnChainEntitlementRaw = {
  tokenId: bigint;
  providerId: string;
  serviceId: string;
  serviceName: string;
  originalDuration: bigint;
  remainingDuration: bigint;
  startTime: bigint;
  expiryTime: bigint;
  status: number;
  owner: string;
};

export async function getOnChainEntitlement(tokenId: number | bigint): Promise<Entitlement | null> {
  try {
    const raw = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      abi: entitlementAbi,
      functionName: "getEntitlement",
      args: [BigInt(tokenId)],
    })) as OnChainEntitlementRaw;

    if (!raw || !raw.tokenId) return null;

    const frontendSvcId = toFrontendServiceId(raw.serviceId);
    const svc = getService(frontendSvcId);
    const isCredit = svc?.unit === "credits" || raw.serviceId.includes("CREDIT");
    const unit = isCredit ? "credits" : "days";

    const remainingSec = Number(raw.remainingDuration);
    const originalSec = Number(raw.originalDuration);

    const remaining = isCredit
      ? Math.round((remainingSec * 1500) / (30 * 86400))
      : Math.ceil(remainingSec / 86400);

    const original = isCredit
      ? Math.round((originalSec * 1500) / (30 * 86400))
      : Math.ceil(originalSec / 86400);

    const used = Math.max(0, original - remaining);

    const purchasedAt = Number(raw.startTime) * 1000;
    const expiresAt = Number(raw.expiryTime) * 1000;
    const now = Date.now();
    const status: EntitlementStatus =
      now >= expiresAt || remaining <= 0 ? "EXPIRED" : statusEnumToString(raw.status);

    return {
      tokenId: Number(raw.tokenId),
      serviceId: frontendSvcId,
      owner: raw.owner,
      originalDuration: original,
      usedDuration: used,
      remainingDuration: remaining,
      unit,
      status,
      purchasedAt,
      expiresAt,
    };
  } catch {
    return null;
  }
}

export type OnChainListingRaw = {
  tokenId: bigint;
  seller: string;
  priceWei: bigint;
  listedAt: bigint;
  active: boolean;
};

export async function getOnChainActiveListings(): Promise<{ listings: Listing[]; entitlements: Entitlement[] }> {
  const rawListings = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.SplitXMarketplace,
    abi: marketplaceAbi,
    functionName: "getActiveListings",
  })) as OnChainListingRaw[];

  const listings: Listing[] = [];
  const entitlements: Entitlement[] = [];

  for (const item of rawListings) {
    if (!item.active) continue;
    const tid = Number(item.tokenId);
    const ent = await getOnChainEntitlement(tid);
    if (!ent) continue;

    const priceEth = formatEther(item.priceWei);

    const entWithListing: Entitlement = {
      ...ent,
      owner: item.seller,
      status: "LISTED",
      listedAt: Number(item.listedAt) * 1000,
      listingPriceEth: priceEth,
    };

    const listing: Listing = {
      tokenId: tid,
      serviceId: ent.serviceId,
      seller: item.seller,
      priceEth,
      duration: ent.remainingDuration,
      unit: ent.unit,
      active: true,
      listedAt: Number(item.listedAt) * 1000,
    };

    listings.push(listing);
    entitlements.push(entWithListing);
  }

  return { listings, entitlements };
}

export async function getOnChainListing(tokenId: number | bigint): Promise<Listing | null> {
  try {
    const raw = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXMarketplace,
      abi: marketplaceAbi,
      functionName: "getListing",
      args: [BigInt(tokenId)],
    })) as OnChainListingRaw;

    if (!raw || !raw.active) return null;
    const ent = await getOnChainEntitlement(Number(tokenId));

    return {
      tokenId: Number(raw.tokenId),
      serviceId: ent?.serviceId ?? "netflix",
      seller: raw.seller,
      priceEth: formatEther(raw.priceWei),
      duration: ent?.remainingDuration ?? 0,
      unit: ent?.unit ?? "days",
      active: raw.active,
      listedAt: Number(raw.listedAt) * 1000,
    };
  } catch {
    return null;
  }
}

export async function getOnChainProviderState(
  userAddress: string,
  serviceId: string,
): Promise<{ remainingDurationSec: number; active: boolean }> {
  try {
    const contractSvcId = toContractServiceId(serviceId);
    const res = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MockProviderAdapter,
      abi: providerAbi,
      functionName: "getProviderEntitlement",
      args: [userAddress as `0x${string}`, contractSvcId],
    })) as [bigint, boolean];

    return {
      remainingDurationSec: Number(res[0]),
      active: res[1],
    };
  } catch {
    return { remainingDurationSec: 0, active: false };
  }
}

export async function discoverOwnedTokenIds(ownerAddress: string): Promise<number[]> {
  const tokenIds = new Set<number>();
  const normalizedOwner = ownerAddress.toLowerCase();

  const apiHost = import.meta.env.VITE_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${apiHost}/api/entitlements/owner/${normalizedOwner}`);
    if (res.ok) {
      const data = (await res.json()) as Array<{ tokenId: number }>;
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item.tokenId === "number") tokenIds.add(item.tokenId);
        }
      }
    }
  } catch {
    /* backend read-only api optional */
  }

  try {
    const activeListings = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXMarketplace,
      abi: marketplaceAbi,
      functionName: "getActiveListings",
    })) as OnChainListingRaw[];

    for (const l of activeListings) {
      if (l.active && l.seller.toLowerCase() === normalizedOwner) {
        tokenIds.add(Number(l.tokenId));
      }
    }
  } catch {
    /* ignore error */
  }

  try {
    const createdLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      event: {
        type: "event",
        name: "EntitlementCreated",
        inputs: [
          { indexed: true, name: "tokenId", type: "uint256" },
          { indexed: true, name: "owner", type: "address" },
          { indexed: false, name: "serviceId", type: "string" },
          { indexed: false, name: "durationDays", type: "uint256" },
          { indexed: false, name: "pricePaid", type: "uint256" },
        ],
      },
      args: {
        owner: ownerAddress as `0x${string}`,
      },
      fromBlock: 0n,
    });
    for (const log of createdLogs) {
      if (log.args.tokenId != null) tokenIds.add(Number(log.args.tokenId));
    }
  } catch {
    /* ignore log error */
  }

  try {
    const transferLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      event: {
        type: "event",
        name: "Transfer",
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: true, name: "tokenId", type: "uint256" },
        ],
      },
      args: {
        to: ownerAddress as `0x${string}`,
      },
      fromBlock: 0n,
    });
    for (const log of transferLogs) {
      if (log.args.tokenId != null) tokenIds.add(Number(log.args.tokenId));
    }
  } catch {
    /* ignore log error */
  }

  for (let i = 1; i <= 30; i++) {
    tokenIds.add(i);
  }

  return Array.from(tokenIds);
}

export async function fetchAllOwnedEntitlements(ownerAddress: string): Promise<Entitlement[]> {
  const candidateIds = await discoverOwnedTokenIds(ownerAddress);
  const normalizedOwner = ownerAddress.toLowerCase();
  const ownedEntitlements: Entitlement[] = [];

  for (const tid of candidateIds) {
    const ent = await getOnChainEntitlement(tid);
    if (!ent) continue;

    if (ent.owner.toLowerCase() === normalizedOwner) {
      ownedEntitlements.push(ent);
      continue;
    }

    try {
      const listing = await getOnChainListing(tid);
      if (listing && listing.active && listing.seller.toLowerCase() === normalizedOwner) {
        ownedEntitlements.push({
          ...ent,
          owner: ownerAddress,
          status: "LISTED",
          listingPriceEth: listing.priceEth,
        });
      }
    } catch {
      /* ignore listing check */
    }
  }

  return ownedEntitlements;
}
