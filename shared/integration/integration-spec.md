# SplitX Frontend Integration Specification

This document provides the complete technical specification, contract signatures, data structures, event interfaces, and integration guide for the **SplitX** Web3 marketplace frontend.

---

## 1. Network & Configuration

- **Target Chain**: Arbitrum Sepolia
- **Chain ID**: `421614` (`0x66eee`)
- **RPC URL**: `https://sepolia-rollup.arbitrum.io/rpc`
- **Native Currency**: ETH (18 decimals)
- **Explorer**: `https://sepolia.arbiscan.io/`

### Configuration Files

All contract addresses and ABIs are stored in `/shared/integration/`:

- Address config: [`/shared/integration/contract-addresses.json`](file:///d:/SplitX/shared/integration/contract-addresses.json)
- ABIs:
  - [`SplitXEntitlement.json`](file:///d:/SplitX/shared/integration/abis/SplitXEntitlement.json)
  - [`SplitXMarketplace.json`](file:///d:/SplitX/shared/integration/abis/SplitXMarketplace.json)
  - [`MockProviderAdapter.json`](file:///d:/SplitX/shared/integration/abis/MockProviderAdapter.json)

> **Frontend Integration Rule**: Import contract addresses strictly from `contract-addresses.json`. Do not hardcode addresses in frontend components.

---

## 2. Data Structures & Types

### Entitlement Status Enum
```solidity
enum Status {
    ACTIVE,    // 0
    LISTED,    // 1
    LOCKED,    // 2
    EXPIRED,   // 3
    SOLD,      // 4
    CANCELLED  // 5
}
```

### Entitlement Struct
```typescript
interface Entitlement {
  tokenId: bigint;
  providerId: string;
  serviceId: string;
  serviceName: string;
  originalDuration: bigint;  // seconds
  remainingDuration: bigint; // seconds
  startTime: bigint;         // timestamp
  expiryTime: bigint;        // timestamp
  status: number;            // Status enum index
  owner: string;             // current owner address
}
```

### Service Struct
```typescript
interface Service {
  serviceId: string;
  providerId: string;
  serviceName: string;
  pricePerDayWei: bigint;
  active: boolean;
  providerWallet: string;
}
```

### Marketplace Listing Struct
```typescript
interface Listing {
  tokenId: bigint;
  seller: string;
  priceWei: bigint;
  listedAt: bigint; // timestamp
  active: boolean;
}
```

---

## 3. Smart Contract Functions Reference

### `SplitXEntitlement`

#### 1. Buy Entitlement (`purchaseService`)
```solidity
function purchaseService(string calldata serviceId, uint256 durationDays) external payable returns (uint256 tokenId)
```
- **Description**: Buys an entitlement for exact duration in days directly from the provider.
- **Payable**: Send ETH >= `getServicePrice(serviceId, durationDays)`. Excess ETH is automatically refunded.
- **Side Effect**: Mints NFT, stores metadata, and triggers `MockProviderAdapter.provisionEntitlement`.

#### 2. Split Entitlement (`splitEntitlement`)
```solidity
function splitEntitlement(uint256 tokenId, uint256 splitDurationDays) external returns (uint256 newTokenId)
```
- **Description**: Splits `splitDurationDays` out of parent `tokenId`.
- **Requirements**:
  - `msg.sender` must be owner of `tokenId`.
  - `splitDurationDays > 0` and `< parent.remainingDurationInDays`.
  - `tokenId` must be `ACTIVE` and not expired.
- **Side Effect**: Reduces parent duration, mints child NFT with `splitDurationDays`, assigns child to `msg.sender`.

#### 3. Calculate Price (`getServicePrice`)
```solidity
function getServicePrice(string calldata serviceId, uint256 durationDays) external view returns (uint256 priceWei)
```

#### 4. Query Entitlement (`getEntitlement`)
```solidity
function getEntitlement(uint256 tokenId) external view returns (Entitlement memory)
```

#### 5. List Registered Services (`getAllServiceIds` / `getService`)
```solidity
function getAllServiceIds() external view returns (string[] memory)
function getService(string calldata serviceId) external view returns (Service memory)
```

---

### `SplitXMarketplace`

#### 1. List Entitlement (`listEntitlement`)
```solidity
function listEntitlement(uint256 tokenId, uint256 priceWei) external
```
- **Description**: Lists an entitlement NFT for sale on the marketplace.
- **Pre-requisite**: Seller must call `SplitXEntitlement.approve(marketplaceAddress, tokenId)` or `setApprovalForAll`.
- **Side Effect**:
  - NFT transferred into Marketplace contract (Escrow).
  - Entitlement status set to `LISTED` (1).
  - Automatically detaches service entitlement from seller in `MockProviderAdapter` (seller can no longer use it!).

#### 2. Cancel Listing (`cancelListing`)
```solidity
function cancelListing(uint256 tokenId) external
```
- **Description**: Cancels an active listing.
- **Side Effect**: Returns NFT to seller, resets status to `ACTIVE` (0), re-provisions service to seller in `MockProviderAdapter`.

#### 3. Buy Listed Entitlement (`buyEntitlement`)
```solidity
function buyEntitlement(uint256 tokenId) external payable
```
- **Description**: Buys a listed entitlement NFT.
- **Payable**: Send exact `listing.priceWei` in ETH.
- **Revenue Split**:
  - 90% -> Seller
  - 5% -> Service Provider
  - 5% -> SplitX Platform
- **Side Effect**: Transfers NFT to buyer, updates status to `ACTIVE` (0), provisions service entitlement to buyer in `MockProviderAdapter`.

#### 4. Query Active Listings (`getActiveListings` / `getListing`)
```solidity
function getActiveListings() external view returns (Listing[] memory)
function getListing(uint256 tokenId) external view returns (Listing memory)
```

---

### `MockProviderAdapter`

#### Query Provider Active Entitlement (`getProviderEntitlement`)
```solidity
function getProviderEntitlement(address user, string calldata serviceId) external view returns (uint256 remainingDurationSec, bool active)
```
- **Description**: Returns simulated active service access status for a user wallet and service ID.

---

## 4. Key Event Signatures

Frontend components can listen for real-time updates via ethers/viem event logs:

```solidity
event EntitlementCreated(uint256 indexed tokenId, address indexed owner, string serviceId, uint256 durationDays, uint256 pricePaid);
event EntitlementSplit(uint256 indexed parentTokenId, uint256 indexed newTokenId, uint256 remainingParentDuration, uint256 newDuration);
event EntitlementListed(uint256 indexed tokenId, address indexed seller, uint256 priceWei);
event ListingCancelled(uint256 indexed tokenId, address indexed seller);
event EntitlementPurchased(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 priceWei);
event ProviderProvisioned(address indexed user, string serviceId, uint256 duration);
event ProviderDetached(address indexed user, string serviceId, uint256 duration);
```

---

## 5. End-to-End User Flow (Frontend Walkthrough)

### Flow 1: User A buys 30 days of Netflix
1. Frontend calls `SplitXEntitlement.getServicePrice("NETFLIX_PREMIUM", 30)`.
2. User A clicks Buy -> Frontend triggers `SplitXEntitlement.purchaseService("NETFLIX_PREMIUM", 30, { value: price })`.
3. User A receives NFT #1 representing 30 days. `MockProviderAdapter` provisions User A.

### Flow 2: User A splits 10 days to sell
1. User A selects 10 days to split.
2. User A clicks Split -> Frontend calls `SplitXEntitlement.splitEntitlement(1, 10)`.
3. NFT #1 remaining duration updates to 20 days. NFT #2 is created with 10 days duration.

### Flow 3: User A lists 10-day entitlement on Marketplace
1. User A sets price to 0.01 ETH.
2. Frontend calls `SplitXEntitlement.approve(marketplaceAddress, 2)`.
3. Frontend calls `SplitXMarketplace.listEntitlement(2, parseEther("0.01"))`.
4. NFT #2 is escrowed in Marketplace. `MockProviderAdapter` detaches 10 days from User A.

### Flow 4: User B buys the 10-day entitlement listing
1. User B browses Marketplace -> sees listing for NFT #2 (10 days @ 0.01 ETH).
2. User B clicks Buy -> Frontend calls `SplitXMarketplace.buyEntitlement(2, { value: parseEther("0.01") })`.
3. Payment settles: 0.009 ETH to User A, 0.0005 ETH to Provider, 0.0005 ETH to SplitX.
4. NFT #2 is transferred to User B. `MockProviderAdapter` provisions User B for 10 days of Netflix Premium!

---

## 6. Read-Only Backend REST API

A lightweight read-only Express API server is available at `http://localhost:3001`:

- `GET /api/health` -> System status
- `GET /api/services` -> Registered services list
- `GET /api/entitlements/:tokenId` -> Entitlement details
- `GET /api/entitlements/owner/:address` -> Entitlements owned by address
- `GET /api/marketplace/listings` -> All marketplace listings
- `GET /api/marketplace/listings/active` -> Active marketplace listings
- `GET /api/provider/entitlements/:address` -> Provider access state for address
