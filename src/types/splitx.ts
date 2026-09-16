export type Category =
  | "Entertainment"
  | "AI"
  | "Productivity"
  | "Cloud"
  | "Education"
  | "Gaming";

export type DurationUnit = "days" | "credits";

export type EntitlementStatus = "ACTIVE" | "LISTED" | "EXPIRED" | "LOCKED";

export type TxStatus =
  | "idle"
  | "preparing"
  | "waiting"
  | "submitted"
  | "confirming"
  | "provisioning"
  | "success"
  | "failed";

export type TxKind =
  | "purchase"
  | "split"
  | "approve"
  | "list"
  | "buy-listing"
  | "cancel"
  | "transfer";

export interface Service {
  id: string;
  name: string;
  category: Category;
  provider: string;
  unit: DurationUnit;
  packageDuration: number;
  packagePriceEth: string;
  image: string;
  blurb: string;
  transferable: boolean;
  resellable: boolean;
  expiryNote: string;
}

export interface Entitlement {
  tokenId: number;
  serviceId: string;
  owner: string;
  originalDuration: number;
  usedDuration: number;
  remainingDuration: number;
  unit: DurationUnit;
  status: EntitlementStatus;
  purchasedAt: number;
  expiresAt: number;
  listedAt?: number;
  listingPriceEth?: string;
}

export interface Listing {
  tokenId: number;
  serviceId: string;
  seller: string;
  priceEth: string;
  duration: number;
  unit: DurationUnit;
  active: boolean;
  listedAt: number;
}

export interface ChainTx {
  hash: string;
  kind: TxKind;
  from: string;
  to?: string;
  tokenId?: number;
  valueEth?: string;
  timestamp: number;
  status: "success" | "failed";
  label: string;
}

export interface ProvisionRecord {
  id: string;
  tokenId: number;
  serviceId: string;
  owner: string;
  duration: number;
  unit: DurationUnit;
  at: number;
  action: "grant" | "revoke" | "transfer";
}

export interface WalletAccount {
  address: string;
  label: string;
  kind: "demo" | "injected";
  balanceEth: string;
}

export interface ChainSnapshot {
  entitlements: Entitlement[];
  listings: Listing[];
  txs: ChainTx[];
  provisions: ProvisionRecord[];
  wallets: Record<string, WalletAccount>;
  nextTokenId: number;
  platformFeesEth: string;
  providerRevenueEth: string;
  volumeEth: string;
  connected?: {
    address: string;
    kind: "demo" | "injected";
    chainId: number;
  };
}
