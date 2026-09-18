import { useSyncExternalStore } from "react";
import {
  DEMO_WALLETS,
  getService,
  PROTOCOL_SELLER,
  PROVIDER_TREASURY,
  PLATFORM_TREASURY,
  quotePrimary,
  quoteResaleSuggest,
  splitProceeds,
} from "@/lib/catalog";
import { addEth, cmpEth, makeTxHash, subEth } from "@/lib/eth";
import { isLiveMode } from "@/lib/blockchain/contracts";
import { formatBlockchainError } from "@/lib/blockchain/errors";
import {
  fetchAllOwnedEntitlements,
  getOnChainActiveListings,
  getOnChainServicePrice,
  getRealEthBalance,
  getOnChainListing,
} from "@/lib/blockchain/reads";
import {
  approveMarketplaceOnChain,
  buyEntitlementOnChain,
  cancelListingOnChain,
  listEntitlementOnChain,
  purchaseServiceOnChain,
  splitEntitlementOnChain,
} from "@/lib/blockchain/writes";
import type { TxStageReporter } from "@/components/tx/tx-context";
import type {
  ChainSnapshot,
  ChainTx,
  Entitlement,
  Listing,
  ProvisionRecord,
  TxKind,
  WalletAccount,
} from "@/types/splitx";
import { formatEther } from "viem";

const STORAGE_KEY = "splitx-demo-ledger-v4";
const DAY_MS = 86_400_000;

const SELLER_DEMO_ADDRESS = DEMO_WALLETS[0].address;

const seedWallets = (): Record<string, WalletAccount> => {
  const map: Record<string, WalletAccount> = {};
  for (const w of DEMO_WALLETS) map[w.address.toLowerCase()] = { ...w };
  map[PROTOCOL_SELLER.toLowerCase()] = {
    address: PROTOCOL_SELLER,
    label: "Protocol Seller",
    kind: "demo",
    balanceEth: "12.0000",
  };
  map[PLATFORM_TREASURY.toLowerCase()] = {
    address: PLATFORM_TREASURY,
    label: "Platform",
    kind: "demo",
    balanceEth: "0.0000",
  };
  map[PROVIDER_TREASURY.toLowerCase()] = {
    address: PROVIDER_TREASURY,
    label: "Providers",
    kind: "demo",
    balanceEth: "0.0000",
  };
  return map;
};

function seed(): ChainSnapshot {
  const now = Date.now();
  const entitlements: Entitlement[] = [
    // Pre-seeded active subscriptions owned by Seller (Lister A) ready to split & sell!
    {
      tokenId: 21,
      serviceId: "netflix",
      owner: SELLER_DEMO_ADDRESS,
      originalDuration: 30,
      usedDuration: 10,
      remainingDuration: 20,
      unit: "days",
      status: "ACTIVE",
      purchasedAt: now - 10 * DAY_MS,
      expiresAt: now + 20 * DAY_MS,
    },
    {
      tokenId: 22,
      serviceId: "spotify",
      owner: SELLER_DEMO_ADDRESS,
      originalDuration: 30,
      usedDuration: 16,
      remainingDuration: 14,
      unit: "days",
      status: "ACTIVE",
      purchasedAt: now - 16 * DAY_MS,
      expiresAt: now + 14 * DAY_MS,
    },
    {
      tokenId: 23,
      serviceId: "ai-api",
      owner: SELLER_DEMO_ADDRESS,
      originalDuration: 1500,
      usedDuration: 500,
      remainingDuration: 1000,
      unit: "credits",
      status: "ACTIVE",
      purchasedAt: now - 5 * DAY_MS,
      expiresAt: now + 25 * DAY_MS,
    },
    // Existing marketplace listings from Protocol Seller
    {
      tokenId: 11,
      serviceId: "netflix",
      owner: PROTOCOL_SELLER,
      originalDuration: 30,
      usedDuration: 20,
      remainingDuration: 10,
      unit: "days",
      status: "LISTED",
      purchasedAt: now - 20 * DAY_MS,
      expiresAt: now + 10 * DAY_MS,
      listedAt: now - DAY_MS,
      listingPriceEth: "0.008",
    },
    {
      tokenId: 12,
      serviceId: "spotify",
      owner: PROTOCOL_SELLER,
      originalDuration: 30,
      usedDuration: 23,
      remainingDuration: 7,
      unit: "days",
      status: "LISTED",
      purchasedAt: now - 23 * DAY_MS,
      expiresAt: now + 7 * DAY_MS,
      listedAt: now - 2 * DAY_MS,
      listingPriceEth: "0.006",
    },
    {
      tokenId: 13,
      serviceId: "ai-api",
      owner: PROTOCOL_SELLER,
      originalDuration: 1500,
      usedDuration: 1000,
      remainingDuration: 500,
      unit: "credits",
      status: "LISTED",
      purchasedAt: now - 12 * DAY_MS,
      expiresAt: now + 18 * DAY_MS,
      listedAt: now - 3 * DAY_MS,
      listingPriceEth: "0.004",
    },
    {
      tokenId: 14,
      serviceId: "apex",
      owner: PROTOCOL_SELLER,
      originalDuration: 30,
      usedDuration: 15,
      remainingDuration: 15,
      unit: "days",
      status: "LISTED",
      purchasedAt: now - 15 * DAY_MS,
      expiresAt: now + 15 * DAY_MS,
      listedAt: now - DAY_MS,
      listingPriceEth: "0.009",
    },
  ];

  const listings: Listing[] = entitlements
    .filter((e) => e.status === "LISTED")
    .map((e) => ({
      tokenId: e.tokenId,
      serviceId: e.serviceId,
      seller: e.owner,
      priceEth: e.listingPriceEth ?? quoteResaleSuggest(getService(e.serviceId)!, e.remainingDuration),
      duration: e.remainingDuration,
      unit: e.unit,
      active: true,
      listedAt: e.listedAt ?? now,
    }));

  const provisions: ProvisionRecord[] = entitlements
    .filter((e) => e.status === "LISTED")
    .map((e) => ({
      id: `prov-${e.tokenId}`,
      tokenId: e.tokenId,
      serviceId: e.serviceId,
      owner: e.owner,
      duration: e.remainingDuration,
      unit: e.unit,
      at: e.listedAt ?? now,
      action: "revoke",
    }));

  return {
    entitlements,
    listings,
    txs: [],
    provisions,
    wallets: seedWallets(),
    nextTokenId: 31,
    platformFeesEth: "0.42",
    providerRevenueEth: "0.62",
    volumeEth: "12.4",
  };
}

const SERVER_SNAP = seed();
let state: ChainSnapshot = SERVER_SNAP;
let hydrated = false;
let isRefreshingLive = false;
let initialSyncPending = isLiveMode();
let syncStatusObj = { isSyncing: false, initialPending: isLiveMode() };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state = seed();
      persist();
    } else {
      const parsed = JSON.parse(raw) as ChainSnapshot;
      state = {
        ...parsed,
        wallets: { ...seedWallets(), ...parsed.wallets },
      };
    }
  } catch {
    state = seed();
  }

  if (isLiveMode()) {
    void refreshLiveState(state.connected?.address);
  }
}

export async function refreshLiveState(userAddress?: string) {
  if (!isLiveMode() || isRefreshingLive) return;
  isRefreshingLive = true;
  syncStatusObj = { isSyncing: true, initialPending: initialSyncPending };
  emit();
  try {
    const { listings: onChainListings, entitlements: listingEntitlements } =
      await getOnChainActiveListings();

    let ownedEntitlements: Entitlement[] = [];
    const isInjected = state.connected?.kind === "injected";
    if (isInjected && userAddress && /^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      ownedEntitlements = await fetchAllOwnedEntitlements(userAddress);
      const realBalance = await getRealEthBalance(userAddress);
      const key = walletKey(userAddress);
      const currentWallet = state.wallets[key] ?? {
        address: userAddress,
        label: "Injected",
        kind: "injected" as const,
        balanceEth: realBalance,
      };
      state.wallets = {
        ...state.wallets,
        [key]: { ...currentWallet, balanceEth: realBalance },
      };
    }

    const map = new Map<number, Entitlement>();
    // Always preserve seed entitlements (e.g. Seller active subscriptions #21, #22, #23)
    for (const e of seed().entitlements) map.set(e.tokenId, e);
    // Preserve local demo entitlements
    for (const e of state.entitlements) map.set(e.tokenId, e);
    // Add on-chain listing entitlements and user owned entitlements
    for (const e of listingEntitlements) map.set(e.tokenId, e);
    for (const e of ownedEntitlements) map.set(e.tokenId, e);

    const seedListings = seed().listings;
    const activeListingsToUse = [
      ...onChainListings,
      ...seedListings.filter((sl) => !onChainListings.some((ol) => ol.tokenId === sl.tokenId)),
    ];

    const mergedEntitlements = Array.from(map.values());

    state = {
      ...state,
      listings: activeListingsToUse,
      entitlements: mergedEntitlements,
    };
    persist();
    emit();
  } catch (err) {
    /* In LIVE mode, logged error without fallback to demo simulation */
    console.error("Failed to refresh live blockchain state:", err);
  } finally {
    isRefreshingLive = false;
    initialSyncPending = false;
    syncStatusObj = { isSyncing: false, initialPending: false };
    emit();
  }
}

function set(patch: Partial<ChainSnapshot>) {
  state = { ...state, ...patch };
  persist();
  emit();
}

function walletKey(addr: string) {
  return addr.toLowerCase();
}

function requireConnected() {
  const c = state.connected;
  if (!c) throw new Error("Connect a wallet to continue.");
  return c;
}

function getWallet(addr: string) {
  const w = state.wallets[walletKey(addr)];
  if (!w) throw new Error("Unknown wallet.");
  return w;
}

function credit(addr: string, amount: string) {
  const key = walletKey(addr);
  const current = state.wallets[key] ?? {
    address: addr,
    label: "Wallet",
    kind: "injected" as const,
    balanceEth: "0",
  };
  state.wallets = {
    ...state.wallets,
    [key]: { ...current, balanceEth: addEth(current.balanceEth, amount) },
  };
}

function debit(addr: string, amount: string) {
  const w = getWallet(addr);
  if (cmpEth(w.balanceEth, amount) < 0) {
    throw new Error("Insufficient ETH on Arbitrum Sepolia.");
  }
  state.wallets = {
    ...state.wallets,
    [walletKey(addr)]: { ...w, balanceEth: subEth(w.balanceEth, amount) },
  };
}

function pushTx(partial: Omit<ChainTx, "timestamp" | "status"> & { hash: string }) {
  const tx: ChainTx = {
    hash: partial.hash,
    kind: partial.kind,
    from: partial.from,
    to: partial.to,
    tokenId: partial.tokenId,
    valueEth: partial.valueEth,
    timestamp: Date.now(),
    status: "success",
    label: partial.label,
  };
  state = { ...state, txs: [tx, ...state.txs].slice(0, 80) };
  return tx;
}

function provision(rec: Omit<ProvisionRecord, "id" | "at">) {
  const row: ProvisionRecord = {
    ...rec,
    id: makeTxHash({ ...rec, n: state.provisions.length, t: Date.now() }),
    at: Date.now(),
  };
  state = { ...state, provisions: [row, ...state.provisions].slice(0, 120) };
}

function touchExpiry(e: Entitlement): Entitlement {
  if (e.status === "EXPIRED") return e;
  if (Date.now() >= e.expiresAt || e.remainingDuration <= 0) {
    return { ...e, status: "EXPIRED", remainingDuration: 0 };
  }
  return e;
}

function liveEntitlements() {
  let dirty = false;
  const next = state.entitlements.map((e) => {
    const t = touchExpiry(e);
    if (t !== e) dirty = true;
    return t;
  });
  if (dirty) {
    const listings = state.listings.map((l) => {
      const e = next.find((x) => x.tokenId === l.tokenId);
      if (e?.status === "EXPIRED" && l.active) return { ...l, active: false };
      return l;
    });
    state = { ...state, entitlements: next, listings };
  }
  return state.entitlements;
}

export function isLiveContracts() {
  return isLiveMode();
}

export const ledger = {
  get: () => state,
  hydrate,
  subscribe(fn: () => void) {
    hydrate();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  reset() {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    const connected = state.connected;
    state = seed();
    state.connected = connected;
    persist();
    emit();
  },
  connectDemo(address: string) {
    hydrate();
    const w = getWallet(address);
    set({
      connected: { address: w.address, kind: "demo", chainId: 421614 },
    });
  },
  async connectInjected(address: string, chainId: number) {
    hydrate();
    const key = walletKey(address);
    let realBal = "1.5000";
    if (isLiveMode()) {
      try {
        realBal = await getRealEthBalance(address);
      } catch {
        realBal = "0.0000";
      }
    }
    state.wallets = {
      ...state.wallets,
      [key]: {
        address,
        label: "Injected",
        kind: "injected",
        balanceEth: realBal,
      },
    };
    set({ connected: { address, kind: "injected", chainId } });
    if (isLiveMode()) {
      await refreshLiveState(address);
    }
  },
  setChainId(chainId: number) {
    if (!state.connected) return;
    set({ connected: { ...state.connected, chainId } });
  },
  disconnect() {
    set({ connected: undefined });
  },
  async purchasePrimary(serviceId: string, duration: number, reportStage?: TxStageReporter) {
    const c = requireConnected();
    const service = getService(serviceId);
    if (!service) throw new Error("Unknown service.");
    if (duration <= 0) throw new Error("Select a duration.");

    if (isLiveMode() && c.kind === "injected") {
      reportStage?.("preparing");
      const priceWei = await getOnChainServicePrice(serviceId, duration);
      const priceEth = formatEther(priceWei);

      reportStage?.("waiting");
      const { hash, tokenId } = await purchaseServiceOnChain(c.address, serviceId, duration);

      reportStage?.("submitted", { hash, tokenId });
      reportStage?.("confirming", { hash, tokenId });
      reportStage?.("provisioning", { hash, tokenId });

      const tx = pushTx({
        hash,
        kind: "purchase",
        from: c.address,
        tokenId,
        valueEth: priceEth,
        label: `Buy ${service.name} · ${duration} ${service.unit}`,
      });

      provision({
        tokenId,
        serviceId,
        owner: c.address,
        duration,
        unit: service.unit,
        action: "grant",
      });

      await refreshLiveState(c.address);
      reportStage?.("success", { hash, tokenId });
      return { tokenId, tx, price: priceEth };
    }

    // DEMO mode fallback (only active when addresses are zero)
    const price = quotePrimary(service, duration);
    debit(c.address, price);
    credit(PLATFORM_TREASURY, splitProceeds(price).platform);
    credit(PROVIDER_TREASURY, addEth(splitProceeds(price).provider, splitProceeds(price).seller));
    const tokenId = state.nextTokenId;
    const now = Date.now();
    const unitMs = service.unit === "credits" ? DAY_MS / 50 : DAY_MS;
    const ent: Entitlement = {
      tokenId,
      serviceId,
      owner: c.address,
      originalDuration: duration,
      usedDuration: 0,
      remainingDuration: duration,
      unit: service.unit,
      status: "ACTIVE",
      purchasedAt: now,
      expiresAt: now + duration * unitMs,
    };
    state = {
      ...state,
      nextTokenId: tokenId + 1,
      entitlements: [ent, ...state.entitlements],
      volumeEth: addEth(state.volumeEth, price),
      platformFeesEth: addEth(state.platformFeesEth, splitProceeds(price).platform),
      providerRevenueEth: addEth(state.providerRevenueEth, splitProceeds(price).provider),
    };
    provision({
      tokenId,
      serviceId,
      owner: c.address,
      duration,
      unit: service.unit,
      action: "grant",
    });
    const tx = pushTx({
      hash: makeTxHash({ kind: "purchase", from: c.address, n: state.txs.length, t: Date.now() }),
      kind: "purchase",
      from: c.address,
      tokenId,
      valueEth: price,
      label: `Buy ${service.name} · ${duration} ${service.unit}`,
    });
    persist();
    emit();
    return { tokenId, tx, price };
  },
  async splitEntitlement(tokenId: number, duration: number, reportStage?: TxStageReporter) {
    const c = requireConnected();

    if (isLiveMode() && c.kind === "injected") {
      reportStage?.("preparing");
      reportStage?.("waiting");

      const { hash, newTokenId } = await splitEntitlementOnChain(c.address, tokenId, duration);

      reportStage?.("submitted", { hash, tokenId: newTokenId });
      reportStage?.("confirming", { hash, tokenId: newTokenId });
      reportStage?.("provisioning", { hash, tokenId: newTokenId });

      const tx = pushTx({
        hash,
        kind: "split",
        from: c.address,
        tokenId: newTokenId,
        label: `Split token #${tokenId} → #${newTokenId} (${duration})`,
      });

      await refreshLiveState(c.address);
      reportStage?.("success", { hash, tokenId: newTokenId });

      const current = state.entitlements.find((e) => e.tokenId === tokenId);
      const minted = state.entitlements.find((e) => e.tokenId === newTokenId);
      return { original: current, minted, tx };
    }

    // DEMO mode fallback
    const current = liveEntitlements().find((e) => e.tokenId === tokenId);
    if (!current) throw new Error("Entitlement not found.");
    if (current.owner.toLowerCase() !== c.address.toLowerCase()) {
      throw new Error("You don't own this entitlement.");
    }
    if (current.status === "LISTED" || current.status === "LOCKED") {
      throw new Error("This entitlement is already listed.");
    }
    if (current.status === "EXPIRED") throw new Error("This entitlement has expired.");
    if (duration <= 0 || duration >= current.remainingDuration) {
      throw new Error("Split duration must be less than remaining time.");
    }
    const newId = state.nextTokenId;
    const now = Date.now();
    const unitMs = current.unit === "credits" ? DAY_MS / 50 : DAY_MS;
    const original: Entitlement = {
      ...current,
      remainingDuration: current.remainingDuration - duration,
      originalDuration: current.originalDuration,
    };
    const minted: Entitlement = {
      tokenId: newId,
      serviceId: current.serviceId,
      owner: c.address,
      originalDuration: duration,
      usedDuration: 0,
      remainingDuration: duration,
      unit: current.unit,
      status: "ACTIVE",
      purchasedAt: now,
      expiresAt: now + duration * unitMs,
    };
    state = {
      ...state,
      nextTokenId: newId + 1,
      entitlements: state.entitlements.map((e) => (e.tokenId === tokenId ? original : e)).concat(minted),
    };
    const tx = pushTx({
      hash: makeTxHash({ kind: "split", from: c.address, n: state.txs.length, t: Date.now() }),
      kind: "split",
      from: c.address,
      tokenId: newId,
      label: `Split token #${tokenId} → #${newId} (${duration})`,
    });
    persist();
    emit();
    return { original, minted, tx };
  },
  async approveAndList(tokenId: number, priceEth: string, reportStage?: TxStageReporter) {
    const c = requireConnected();
    const price = Number(priceEth);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid listing price.");

    if (isLiveMode() && c.kind === "injected") {
      reportStage?.("preparing");
      reportStage?.("waiting");

      const approveHash = await approveMarketplaceOnChain(c.address, tokenId);
      if (approveHash) {
        pushTx({
          hash: approveHash,
          kind: "approve",
          from: c.address,
          tokenId,
          label: `Approve NFT #${tokenId}`,
        });
      }

      reportStage?.("submitted");
      const listHash = await listEntitlementOnChain(c.address, tokenId, priceEth);

      reportStage?.("confirming", { hash: listHash });
      reportStage?.("provisioning", { hash: listHash });

      const tx = pushTx({
        hash: listHash,
        kind: "list",
        from: c.address,
        tokenId,
        valueEth: priceEth,
        label: `List token #${tokenId}`,
      });

      await refreshLiveState(c.address);
      reportStage?.("success", { hash: listHash });

      const listing = state.listings.find((l) => l.tokenId === tokenId) ?? {
        tokenId,
        serviceId: "netflix",
        seller: c.address,
        priceEth,
        duration: 10,
        unit: "days" as const,
        active: true,
        listedAt: Date.now(),
      };

      return { tx, listing };
    }

    // DEMO mode fallback
    const current = liveEntitlements().find((e) => e.tokenId === tokenId);
    if (!current) throw new Error("Entitlement not found.");
    if (current.owner.toLowerCase() !== c.address.toLowerCase()) {
      throw new Error("You don't own this entitlement.");
    }
    if (current.status === "LISTED") throw new Error("This entitlement is already listed.");
    if (current.status === "EXPIRED") throw new Error("This entitlement has expired.");
    if (current.remainingDuration <= 0) throw new Error("Nothing left to sell.");

    const locked: Entitlement = {
      ...current,
      status: "LISTED",
      listedAt: Date.now(),
      listingPriceEth: priceEth,
    };
    const listing: Listing = {
      tokenId,
      serviceId: current.serviceId,
      seller: c.address,
      priceEth,
      duration: current.remainingDuration,
      unit: current.unit,
      active: true,
      listedAt: Date.now(),
    };
    state = {
      ...state,
      entitlements: state.entitlements.map((e) => (e.tokenId === tokenId ? locked : e)),
      listings: [listing, ...state.listings.filter((l) => l.tokenId !== tokenId)],
    };
    provision({
      tokenId,
      serviceId: current.serviceId,
      owner: c.address,
      duration: current.remainingDuration,
      unit: current.unit,
      action: "revoke",
    });
    pushTx({
      hash: makeTxHash({ kind: "approve", from: c.address, n: state.txs.length, t: Date.now() }),
      kind: "approve",
      from: c.address,
      tokenId,
      label: `Approve NFT #${tokenId}`,
    });
    const tx = pushTx({
      hash: makeTxHash({ kind: "list", from: c.address, n: state.txs.length + 1, t: Date.now() }),
      kind: "list",
      from: c.address,
      tokenId,
      valueEth: priceEth,
      label: `List token #${tokenId}`,
    });
    persist();
    emit();
    return { tx, listing };
  },
  async cancelListing(tokenId: number, reportStage?: TxStageReporter) {
    const c = requireConnected();

    if (isLiveMode() && c.kind === "injected") {
      reportStage?.("preparing");
      reportStage?.("waiting");

      const hash = await cancelListingOnChain(c.address, tokenId);

      reportStage?.("submitted", { hash });
      reportStage?.("confirming", { hash });
      reportStage?.("provisioning", { hash });

      const tx = pushTx({
        hash,
        kind: "cancel",
        from: c.address,
        tokenId,
        label: `Cancel listing #${tokenId}`,
      });

      await refreshLiveState(c.address);
      reportStage?.("success", { hash });
      return { tx };
    }

    // DEMO mode fallback
    const listing = state.listings.find((l) => l.tokenId === tokenId && l.active);
    if (!listing) throw new Error("This listing is no longer available.");
    if (listing.seller.toLowerCase() !== c.address.toLowerCase()) {
      throw new Error("Only the seller can cancel this listing.");
    }
    const current = liveEntitlements().find((e) => e.tokenId === tokenId);
    if (!current) throw new Error("Entitlement not found.");
    state = {
      ...state,
      listings: state.listings.map((l) => (l.tokenId === tokenId ? { ...l, active: false } : l)),
      entitlements: state.entitlements.map((e) =>
        e.tokenId === tokenId ? { ...e, status: "ACTIVE", listedAt: undefined } : e,
      ),
    };
    provision({
      tokenId,
      serviceId: current.serviceId,
      owner: c.address,
      duration: current.remainingDuration,
      unit: current.unit,
      action: "grant",
    });
    const tx = pushTx({
      hash: makeTxHash({ kind: "cancel", from: c.address, n: state.txs.length, t: Date.now() }),
      kind: "cancel",
      from: c.address,
      tokenId,
      label: `Cancel listing #${tokenId}`,
    });
    persist();
    emit();
    return { tx };
  },
  async buyListing(tokenId: number, reportStage?: TxStageReporter) {
    const c = requireConnected();

    if (isLiveMode() && c.kind === "injected") {
      reportStage?.("preparing");
      const onChainListing = await getOnChainListing(tokenId);
      if (onChainListing && onChainListing.active) {
        if (onChainListing.seller.toLowerCase() === c.address.toLowerCase()) {
          throw new Error("You already own this entitlement.");
        }

        reportStage?.("waiting");
        const hash = await buyEntitlementOnChain(c.address, tokenId);

        reportStage?.("submitted", { hash });
        reportStage?.("confirming", { hash });
        reportStage?.("provisioning", { hash });

        const tx = pushTx({
          hash,
          kind: "buy-listing",
          from: c.address,
          to: onChainListing.seller,
          tokenId,
          valueEth: onChainListing.priceEth,
          label: `Buy listing #${tokenId}`,
        });

        await refreshLiveState(c.address);
        reportStage?.("success", { hash });
        return { tx, listing: onChainListing };
      }
      // If not active on-chain, fall through to demo handling for seed protocol listings
    }

    // DEMO mode fallback
    const listing = state.listings.find((l) => l.tokenId === tokenId && l.active);
    if (!listing) throw new Error("This listing is no longer available.");
    if (listing.seller.toLowerCase() === c.address.toLowerCase()) {
      throw new Error("You already own this entitlement.");
    }
    const current = liveEntitlements().find((e) => e.tokenId === tokenId);
    if (!current) throw new Error("Entitlement not found.");
    if (current.status === "EXPIRED") throw new Error("This entitlement has expired.");
    debit(c.address, listing.priceEth);
    const split = splitProceeds(listing.priceEth);
    credit(listing.seller, split.seller);
    credit(PLATFORM_TREASURY, split.platform);
    credit(PROVIDER_TREASURY, split.provider);
    state = {
      ...state,
      listings: state.listings.map((l) => (l.tokenId === tokenId ? { ...l, active: false } : l)),
      entitlements: state.entitlements.map((e) =>
        e.tokenId === tokenId
          ? {
              ...e,
              owner: c.address,
              status: "ACTIVE",
              listedAt: undefined,
              listingPriceEth: undefined,
            }
          : e,
      ),
      volumeEth: addEth(state.volumeEth, listing.priceEth),
      platformFeesEth: addEth(state.platformFeesEth, split.platform),
      providerRevenueEth: addEth(state.providerRevenueEth, split.provider),
    };
    provision({
      tokenId,
      serviceId: current.serviceId,
      owner: listing.seller,
      duration: current.remainingDuration,
      unit: current.unit,
      action: "revoke",
    });
    provision({
      tokenId,
      serviceId: current.serviceId,
      owner: c.address,
      duration: current.remainingDuration,
      unit: current.unit,
      action: "transfer",
    });
    const tx = pushTx({
      hash: makeTxHash({ kind: "buy-listing", from: c.address, n: state.txs.length, t: Date.now() }),
      kind: "buy-listing",
      from: c.address,
      to: listing.seller,
      tokenId,
      valueEth: listing.priceEth,
      label: `Buy listing #${tokenId}`,
    });
    persist();
    emit();
    return { tx, listing };
  },
  fastForward(tokenId: number, amount: number) {
    const c = requireConnected();
    const current = liveEntitlements().find((e) => e.tokenId === tokenId);
    if (!current) throw new Error("Entitlement not found.");
    if (current.owner.toLowerCase() !== c.address.toLowerCase()) {
      throw new Error("You don't own this entitlement.");
    }
    if (current.status !== "ACTIVE") {
      throw new Error("Locked in SplitX — listed entitlements cannot be used.");
    }
    const used = Math.min(amount, current.remainingDuration);
    const remaining = current.remainingDuration - used;
    const next: Entitlement = {
      ...current,
      usedDuration: current.usedDuration + used,
      remainingDuration: remaining,
      status: remaining <= 0 ? "EXPIRED" : "ACTIVE",
    };
    state = {
      ...state,
      entitlements: state.entitlements.map((e) => (e.tokenId === tokenId ? next : e)),
    };
    persist();
    emit();
    return next;
  },
};

export function useLedger() {
  return useSyncExternalStore(ledger.subscribe, ledger.get, () => SERVER_SNAP);
}

const SERVER_SYNC_STATUS = { isSyncing: false, initialPending: false };

export function useLiveSyncStatus() {
  return useSyncExternalStore(
    ledger.subscribe,
    () => syncStatusObj,
    () => SERVER_SYNC_STATUS
  );
}

export function humanError(err: unknown) {
  return formatBlockchainError(err);
}

export function txKindLabel(kind: TxKind) {
  switch (kind) {
    case "purchase":
      return "Primary purchase";
    case "split":
      return "Split entitlement";
    case "approve":
      return "Approve NFT";
    case "list":
      return "List NFT";
    case "buy-listing":
      return "Marketplace buy";
    case "cancel":
      return "Cancel listing";
    case "transfer":
      return "Transfer";
    default:
      return kind;
  }
}
