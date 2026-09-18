import { parseEther, decodeEventLog } from "viem";
import { publicClient, getInjectedWalletClient } from "./client";
import { CONTRACT_ADDRESSES, entitlementAbi, marketplaceAbi } from "./contracts";
import { getOnChainListing, getOnChainServicePrice, toContractServiceId } from "./reads";

export async function purchaseServiceOnChain(
  accountAddress: string,
  serviceId: string,
  durationDays: number,
): Promise<{ hash: `0x${string}`; tokenId: number }> {
  const walletClient = getInjectedWalletClient(accountAddress);
  const contractSvcId = toContractServiceId(serviceId);
  const priceWei = await getOnChainServicePrice(serviceId, durationDays);

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "purchaseService",
    args: [contractSvcId, BigInt(durationDays)],
    value: priceWei,
    account: accountAddress as `0x${string}`,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let mintedTokenId: number | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: entitlementAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "EntitlementCreated") {
        const args = decoded.args as { tokenId?: bigint };
        if (args.tokenId != null) {
          mintedTokenId = Number(args.tokenId);
          break;
        }
      }
    } catch {
      /* continue parsing next log */
    }
  }

  if (mintedTokenId == null) {
    throw new Error("Transaction confirmed but EntitlementCreated event log was not found.");
  }

  return { hash, tokenId: mintedTokenId };
}

export async function splitEntitlementOnChain(
  accountAddress: string,
  tokenId: number,
  splitDurationDays: number,
): Promise<{ hash: `0x${string}`; newTokenId: number }> {
  const walletClient = getInjectedWalletClient(accountAddress);

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "splitEntitlement",
    args: [BigInt(tokenId), BigInt(splitDurationDays)],
    account: accountAddress as `0x${string}`,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let newTokenId: number | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: entitlementAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "EntitlementSplit") {
        const args = decoded.args as { newTokenId?: bigint };
        if (args.newTokenId != null) {
          newTokenId = Number(args.newTokenId);
          break;
        }
      }
    } catch {
      /* continue parsing next log */
    }
  }

  if (newTokenId == null) {
    throw new Error("Transaction confirmed but EntitlementSplit event log was not found.");
  }

  return { hash, newTokenId };
}

export async function approveMarketplaceOnChain(
  accountAddress: string,
  tokenId: number,
): Promise<`0x${string}` | null> {
  const approvedAddr = (await publicClient.readContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "getApproved",
    args: [BigInt(tokenId)],
  })) as string;

  if (approvedAddr.toLowerCase() === CONTRACT_ADDRESSES.SplitXMarketplace.toLowerCase()) {
    return null; // Already approved
  }

  const walletClient = getInjectedWalletClient(accountAddress);
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "approve",
    args: [CONTRACT_ADDRESSES.SplitXMarketplace, BigInt(tokenId)],
    account: accountAddress as `0x${string}`,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function listEntitlementOnChain(
  accountAddress: string,
  tokenId: number,
  priceEth: string,
): Promise<`0x${string}`> {
  const walletClient = getInjectedWalletClient(accountAddress);
  const priceWei = parseEther(priceEth);

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXMarketplace,
    abi: marketplaceAbi,
    functionName: "listEntitlement",
    args: [BigInt(tokenId), priceWei],
    account: accountAddress as `0x${string}`,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function cancelListingOnChain(
  accountAddress: string,
  tokenId: number,
): Promise<`0x${string}`> {
  const walletClient = getInjectedWalletClient(accountAddress);

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXMarketplace,
    abi: marketplaceAbi,
    functionName: "cancelListing",
    args: [BigInt(tokenId)],
    account: accountAddress as `0x${string}`,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function buyEntitlementOnChain(
  accountAddress: string,
  tokenId: number,
): Promise<`0x${string}`> {
  const listing = await getOnChainListing(tokenId);
  if (!listing || !listing.active) {
    throw new Error("Listing is no longer active on the blockchain.");
  }

  const walletClient = getInjectedWalletClient(accountAddress);
  const priceWei = parseEther(listing.priceEth);

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXMarketplace,
    abi: marketplaceAbi,
    functionName: "buyEntitlement",
    args: [BigInt(tokenId)],
    value: priceWei,
    account: accountAddress as `0x${string}`,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
