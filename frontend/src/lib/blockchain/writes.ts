import { parseEther, decodeEventLog } from "viem";
import { publicClient, getInjectedWalletClient } from "./client";
import { CONTRACT_ADDRESSES, entitlementAbi, marketplaceAbi } from "./contracts";
import { getOnChainListing, getOnChainServicePrice, toContractServiceId } from "./reads";

/**
 * Fetch current gas fees for Arbitrum Sepolia.
 * On Arbitrum L2, priority fee is 0n (FCFS sequencer, no miner tips).
 */
async function getGasOverrides() {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    if (fees.maxFeePerGas) {
      const buffered = (fees.maxFeePerGas * 130n) / 100n;
      return {
        maxFeePerGas: buffered,
        maxPriorityFeePerGas: 0n,
      };
    }
  } catch {
    /* fallback to getGasPrice */
  }
  const gasPrice = await publicClient.getGasPrice();
  const buffered = (gasPrice * 130n) / 100n;
  return {
    maxFeePerGas: buffered,
    maxPriorityFeePerGas: 0n,
  };
}

export async function purchaseServiceOnChain(
  accountAddress: string,
  serviceId: string,
  durationDays: number,
): Promise<{ hash: `0x${string}`; tokenId: number }> {
  const walletClient = getInjectedWalletClient(accountAddress);
  const contractSvcId = toContractServiceId(serviceId);
  const priceWei = await getOnChainServicePrice(serviceId, durationDays);
  const gas = await getGasOverrides();

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "purchaseService",
    args: [contractSvcId, BigInt(durationDays)],
    value: priceWei,
    account: accountAddress as `0x${string}`,
    ...gas,
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
  // 1. Verify token exists and caller is owner
  try {
    const owner = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      abi: entitlementAbi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    })) as string;

    if (owner.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error(`You are not the on-chain owner of Token #${tokenId}.`);
    }
  } catch (err: any) {
    if (err?.message?.includes("not the on-chain owner")) throw err;
    throw new Error(
      `Token #${tokenId} does not exist on the blockchain. It may be a local demo entitlement that hasn't been purchased on-chain.`,
    );
  }

  const walletClient = getInjectedWalletClient(accountAddress);
  const gas = await getGasOverrides();

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "splitEntitlement",
    args: [BigInt(tokenId), BigInt(splitDurationDays)],
    account: accountAddress as `0x${string}`,
    ...gas,
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
  // 1. Verify the token exists and caller owns it.
  try {
    const owner = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      abi: entitlementAbi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    })) as string;

    if (owner.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error(`You are not the on-chain owner of Token #${tokenId}.`);
    }
  } catch (err: any) {
    if (err?.message?.includes("not the on-chain owner")) throw err;
    throw new Error(
      `Token #${tokenId} does not exist on the blockchain. It may be a local demo entitlement that hasn't been purchased on-chain.`,
    );
  }

  // 2. Check if operator approval for all is active.
  try {
    const isApprovedAll = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      abi: entitlementAbi,
      functionName: "isApprovedForAll",
      args: [accountAddress as `0x${string}`, CONTRACT_ADDRESSES.SplitXMarketplace],
    })) as boolean;

    if (isApprovedAll) {
      return null;
    }
  } catch {
    /* continue to per-token approval check */
  }

  // 3. Check if specific token is already approved.
  try {
    const approvedAddr = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      abi: entitlementAbi,
      functionName: "getApproved",
      args: [BigInt(tokenId)],
    })) as string;

    if (approvedAddr.toLowerCase() === CONTRACT_ADDRESSES.SplitXMarketplace.toLowerCase()) {
      return null; // Already approved
    }
  } catch {
    /* continue to approve */
  }

  // 4. Send approve transaction.
  const walletClient = getInjectedWalletClient(accountAddress);
  const gas = await getGasOverrides();
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXEntitlement,
    abi: entitlementAbi,
    functionName: "approve",
    args: [CONTRACT_ADDRESSES.SplitXMarketplace, BigInt(tokenId)],
    account: accountAddress as `0x${string}`,
    ...gas,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  // 5. Poll briefly to make sure the approval is visible to the RPC node
  //    before calling listEntitlement (Arbitrum Sepolia public RPCs can
  //    load-balance across nodes that are a fraction of a second behind).
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 6; i++) {
    try {
      const approved = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.SplitXEntitlement,
        abi: entitlementAbi,
        functionName: "getApproved",
        args: [BigInt(tokenId)],
      })) as string;
      if (approved.toLowerCase() === CONTRACT_ADDRESSES.SplitXMarketplace.toLowerCase()) {
        break;
      }
    } catch {
      // ignore read error
    }
    await wait(500);
  }

  return hash;
}

export async function listEntitlementOnChain(
  accountAddress: string,
  tokenId: number,
  priceEth: string,
): Promise<`0x${string}`> {
  // Pre-verification: check ownership
  try {
    const owner = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.SplitXEntitlement,
      abi: entitlementAbi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    })) as string;
    if (owner.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error(`You are not the on-chain owner of Token #${tokenId}.`);
    }
  } catch (err: any) {
    if (err?.message?.includes("not the on-chain owner")) throw err;
    throw new Error(`Token #${tokenId} does not exist on-chain.`);
  }

  // Pre-verification: check approval status
  try {
    const [approvedAddr, isApprovedAll] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.SplitXEntitlement,
        abi: entitlementAbi,
        functionName: "getApproved",
        args: [BigInt(tokenId)],
      }) as Promise<string>,
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.SplitXEntitlement,
        abi: entitlementAbi,
        functionName: "isApprovedForAll",
        args: [accountAddress as `0x${string}`, CONTRACT_ADDRESSES.SplitXMarketplace],
      }) as Promise<boolean>,
    ]);

    const isApproved =
      isApprovedAll || approvedAddr.toLowerCase() === CONTRACT_ADDRESSES.SplitXMarketplace.toLowerCase();

    if (!isApproved) {
      throw new Error(
        "Marketplace contract is not approved to transfer this entitlement. Please approve first.",
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("Marketplace contract is not approved")) throw err;
    /* other read error, continue to transaction */
  }

  const walletClient = getInjectedWalletClient(accountAddress);
  const priceWei = parseEther(priceEth);
  const gas = await getGasOverrides();

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXMarketplace,
    abi: marketplaceAbi,
    functionName: "listEntitlement",
    args: [BigInt(tokenId), priceWei],
    account: accountAddress as `0x${string}`,
    ...gas,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function cancelListingOnChain(
  accountAddress: string,
  tokenId: number,
): Promise<`0x${string}`> {
  const walletClient = getInjectedWalletClient(accountAddress);
  const gas = await getGasOverrides();

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXMarketplace,
    abi: marketplaceAbi,
    functionName: "cancelListing",
    args: [BigInt(tokenId)],
    account: accountAddress as `0x${string}`,
    ...gas,
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
  const gas = await getGasOverrides();

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.SplitXMarketplace,
    abi: marketplaceAbi,
    functionName: "buyEntitlement",
    args: [BigInt(tokenId)],
    value: priceWei,
    account: accountAddress as `0x${string}`,
    ...gas,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
