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
import { CONTRACTS } from "@/lib/contracts/addresses";
import type {
  ChainSnapshot,
  ChainTx,
  Entitlement,
  Listing,
  ProvisionRecord,
  TxKind,
  WalletAccount,
} from "@/types/splitx";

const STORAGE_KEY = "splitx-demo-ledger-v1";
const DAY_MS = 86_400_000;

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

  const listings: Listing[] = entitlements.map((e) => ({
    tokenId: e.tokenId,
    serviceId: e.serviceId,
    seller: e.owner,
    priceEth: e.listingPriceEth ?? quoteResaleSuggest(getService(e.serviceId)!, e.remainingDuration),
    duration: e.remainingDuration,
    unit: e.unit,
    active: true,
    listedAt: e.listedAt ?? now,
  }));

  const provisions: ProvisionRecord[] = entitlements.map((e) => ({
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
    nextTokenId: 17,
    platformFeesEth: "0.42",
    providerRevenueEth: "0.62",
    volumeEth: "12.4",
  };
}

const SERVER_SNAP = seed();
let state: ChainSnapshot = SERVER_SNAP;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
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
      return;
    }
    const parsed = JSON.parse(raw) as ChainSnapshot;
    state = {
      ...parsed,
      wallets: { ...seedWallets(), ...parsed.wallets },
    };
  } catch {
    state = seed();
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

function pushTx(partial: Omit<ChainTx, "hash" | "timestamp" | "status"> & { hash?: string }) {
  const tx: ChainTx = {
    hash: partial.hash ?? makeTxHash({ ...partial, n: state.txs.length, t: Date.now() }),
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
  const a = CONTRACTS.SplitXEntitlement;
  return Boolean(a && !/^0x0+$/.test(a));
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
  connectInjected(address: string, chainId: number) {
    hydrate();
    const key = walletKey(address);
    if (!state.wallets[key]) {
      state.wallets = {
        ...state.wallets,
        [key]: {
          address,
          label: "Injected",
          kind: "injected",
          balanceEth: "1.5000",
        },
      };
    }
    set({ connected: { address, kind: "injected", chainId } });
  },
  setChainId(chainId: number) {
    if (!state.connected) return;
    set({ connected: { ...state.connected, chainId } });
  },
  disconnect() {
    set({ connected: undefined });
  },
  purchasePrimary(serviceId: string, duration: number) {
    const c = requireConnected();
    const service = getService(serviceId);
    if (!service) throw new Error("Unknown service.");
    if (duration <= 0) throw new Error("Select a duration.");
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
  splitEntitlement(tokenId: number, duration: number) {
    const c = requireConnected();
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
      kind: "split",
      from: c.address,
      tokenId: newId,
      label: `Split token #${tokenId} → #${newId} (${duration})`,
    });
    persist();
    emit();
    return { original, minted, tx };
  },
  approveAndList(tokenId: number, priceEth: string) {
    const c = requireConnected();
    const current = liveEntitlements().find((e) => e.tokenId === tokenId);
    if (!current) throw new Error("Entitlement not found.");
    if (current.owner.toLowerCase() !== c.address.toLowerCase()) {
      throw new Error("You don't own this entitlement.");
    }
    if (current.status === "LISTED") throw new Error("This entitlement is already listed.");
    if (current.status === "EXPIRED") throw new Error("This entitlement has expired.");
    if (current.remainingDuration <= 0) throw new Error("Nothing left to sell.");
    const price = Number(priceEth);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid listing price.");

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
      kind: "approve",
      from: c.address,
      tokenId,
      label: `Approve NFT #${tokenId}`,
    });
    const tx = pushTx({
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
  cancelListing(tokenId: number) {
    const c = requireConnected();
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
      kind: "cancel",
      from: c.address,
      tokenId,
      label: `Cancel listing #${tokenId}`,
    });
    persist();
    emit();
    return { tx };
  },
  buyListing(tokenId: number) {
    const c = requireConnected();
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

export function humanError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("denied") || lower.includes("reject")) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("insufficient")) return "Insufficient ETH on Arbitrum Sepolia.";
  if (lower.includes("listed")) return msg;
  if (lower.includes("expired")) return msg;
  if (lower.includes("own")) return msg;
  if (lower.includes("no longer")) return msg;
  if (lower.includes("connect")) return msg;
  if (lower.includes("provision")) return "Provider provisioning failed.";
  return msg || "Transaction failed.";
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
