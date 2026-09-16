import type { Service, WalletAccount } from "@/types/splitx";

export const CHAIN_ID = 421614;
export const CHAIN_NAME = "Arbitrum Sepolia";
export const PLATFORM_FEE = 0.05;
export const PROVIDER_SHARE = 0.05;
export const SELLER_SHARE = 0.9;

export const PROTOCOL_SELLER = "0x5E11E5000000000000000000000000000000A11E";
export const PLATFORM_TREASURY = "0xFEE0000000000000000000000000000000000005";
export const PROVIDER_TREASURY = "0xADE00000000000000000000000000000000000DE";

export const DEMO_WALLETS: WalletAccount[] = [
  {
    address: "0xA11CE00000000000000000000000000000000001",
    label: "Demo Wallet A",
    kind: "demo",
    balanceEth: "2.0000",
  },
  {
    address: "0xB0B0000000000000000000000000000000000002",
    label: "Demo Wallet B",
    kind: "demo",
    balanceEth: "2.0000",
  },
];

export const SERVICES: Service[] = [
  {
    id: "netflix",
    name: "Netflix Premium",
    category: "Entertainment",
    provider: "Streamhouse",
    unit: "days",
    packageDuration: 30,
    packagePriceEth: "0.03",
    image: "/images/svc-stream.jpg",
    blurb:
      "Full-catalogue streaming for the exact window you need. Mock Provider — this is a demo catalog item, not a Netflix integration.",
    transferable: true,
    resellable: true,
    expiryNote: "Access ends when remaining duration hits zero or the expiry date passes.",
  },
  {
    id: "spotify",
    name: "Spotify Premium",
    category: "Entertainment",
    provider: "Pulse Audio",
    unit: "days",
    packageDuration: 30,
    packagePriceEth: "0.025",
    image: "/images/svc-audio.jpg",
    blurb:
      "Ad-free listening, tokenized by the day. Mock Provider — demo catalog only, not affiliated with Spotify.",
    transferable: true,
    resellable: true,
    expiryNote: "Listed entitlements stay locked until cancelled or purchased.",
  },
  {
    id: "ai-api",
    name: "Cortex AI API",
    category: "AI",
    provider: "Cortex Labs",
    unit: "credits",
    packageDuration: 1500,
    packagePriceEth: "0.02",
    image: "/images/svc-ai.jpg",
    blurb:
      "Inference credits you can split, lock, and resell. Mock Provider adapter provisions the buyer on purchase.",
    transferable: true,
    resellable: true,
    expiryNote: "Credits expire with the entitlement NFT. Unused credits can be listed.",
  },
  {
    id: "nimbus",
    name: "Nimbus Cloud",
    category: "Cloud",
    provider: "Nimbus",
    unit: "days",
    packageDuration: 30,
    packagePriceEth: "0.04",
    image: "/images/svc-cloud.jpg",
    blurb: "Compute and storage window, billed as a transferable entitlement. Mock Provider.",
    transferable: true,
    resellable: true,
    expiryNote: "Expired cloud windows cannot be split or sold.",
  },
  {
    id: "lumen",
    name: "Lumen Learn",
    category: "Education",
    provider: "Lumen",
    unit: "days",
    packageDuration: 30,
    packagePriceEth: "0.015",
    image: "/images/svc-learn.jpg",
    blurb: "Course access you can finish early and resell. Mock Provider.",
    transferable: true,
    resellable: true,
    expiryNote: "Access is bound to the current NFT owner via the provider adapter.",
  },
  {
    id: "forge",
    name: "Forge Workspace",
    category: "Productivity",
    provider: "Forge",
    unit: "days",
    packageDuration: 30,
    packagePriceEth: "0.018",
    image: "/images/svc-work.jpg",
    blurb: "Suite access, split by the week. Mock Provider.",
    transferable: true,
    resellable: true,
    expiryNote: "Locked listings cannot be used until cancelled or sold.",
  },
  {
    id: "apex",
    name: "Apex Game Pass",
    category: "Gaming",
    provider: "Apex Arena",
    unit: "days",
    packageDuration: 30,
    packagePriceEth: "0.022",
    image: "/images/svc-game.jpg",
    blurb: "Season pass time you can hand off mid-campaign. Mock Provider.",
    transferable: true,
    resellable: true,
    expiryNote: "Once listed, the pass is locked in SplitX.",
  },
];

export const BUY_DURATIONS_DAYS = [1, 3, 5, 7, 10, 15, 30];
export const BUY_DURATIONS_CREDITS = [100, 300, 500, 700, 1000, 1500];
export const SELL_DURATIONS_DAYS = [1, 3, 5, 7, 10, 15, 30];
export const SELL_DURATIONS_CREDITS = [100, 300, 500, 700, 1000];

export const CATEGORIES = [
  "Entertainment",
  "AI",
  "Productivity",
  "Cloud",
  "Education",
  "Gaming",
] as const;

export function getService(id: string) {
  return SERVICES.find((s) => s.id === id);
}

export function unitLabel(unit: Service["unit"], n: number) {
  if (unit === "credits") return n === 1 ? "1 credit" : `${n} credits`;
  return n === 1 ? "1 day" : `${n} days`;
}

export function quotePrimary(service: Service, duration: number) {
  const pkg = Number(service.packagePriceEth);
  if (duration >= service.packageDuration) return roundEth(pkg);
  return roundEth((pkg * duration) / service.packageDuration * 1.2);
}

export function quoteDirect(service: Service) {
  return service.packagePriceEth;
}

export function quoteResaleSuggest(service: Service, duration: number) {
  const pkg = Number(service.packagePriceEth);
  return roundEth((pkg * duration) / service.packageDuration * 0.8);
}

export function roundEth(n: number, digits = 6) {
  const f = Number(n.toFixed(digits));
  return String(f);
}

export function splitProceeds(priceEth: string) {
  const p = Number(priceEth);
  return {
    platform: roundEth(p * PLATFORM_FEE),
    provider: roundEth(p * PROVIDER_SHARE),
    seller: roundEth(p * SELLER_SHARE),
  };
}

export function durationOptions(unit: Service["unit"]) {
  return unit === "credits" ? BUY_DURATIONS_CREDITS : BUY_DURATIONS_DAYS;
}

export function sellDurationOptions(unit: Service["unit"], remaining: number) {
  const base = unit === "credits" ? SELL_DURATIONS_CREDITS : SELL_DURATIONS_DAYS;
  const opts = base.filter((d) => d <= remaining);
  if (remaining > 0 && !opts.includes(remaining)) opts.push(remaining);
  return opts;
}
