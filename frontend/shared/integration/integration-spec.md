# SplitX Integration Spec

Frontend consumes this folder as the single contract source of truth.

## Network

- Name: Arbitrum Sepolia
- Chain ID: `421614`
- Payment: ETH
- Explorer: https://sepolia.arbiscan.io

## Contracts

Addresses live in `contract-addresses.json`. Zero addresses mean **not yet deployed**. While addresses are zero, the frontend runs a **Demo Ledger** that implements the same function names and state machine so the hackathon flow can be demonstrated end-to-end.

### SplitXEntitlement (ERC-721)

| Function | Notes |
|---|---|
| `mintPrimary(bytes32 serviceId, uint256 duration) payable → uint256 tokenId` | Buy exact duration on the primary market |
| `splitEntitlement(uint256 tokenId, uint256 duration) → uint256 newTokenId` | Detach unused time into a new NFT |
| `ownerOf(uint256 tokenId)` | Authoritative owner |
| `remainingDuration(uint256 tokenId)` | Remaining units (days or credits) |
| `isLocked(uint256 tokenId)` | True while listed |
| `approve` / `setApprovalForAll` | Required before marketplace list |
| `transferFrom` | Used by marketplace on buy |

### SplitXMarketplace

| Function | Notes |
|---|---|
| `list(uint256 tokenId, uint256 price)` | Locks NFT, creates listing. `price` in wei |
| `buy(uint256 tokenId) payable` | Pays ETH, transfers NFT, triggers provider adapter |
| `cancel(uint256 tokenId)` | Seller only. Returns NFT control to seller |
| `getListing(uint256 tokenId)` | seller, price, active |

Fee split on resale (enforced by marketplace):

- Platform 5%
- Provider 5%
- Seller 90%

### MockProviderAdapter

| Function | Notes |
|---|---|
| `provision(tokenId, owner, duration)` | Called after mint and after resale |
| `revoke(tokenId)` | Called when listing locks or on expiry |

Demo catalog providers are **Mock Providers**. Do not claim real Netflix/Spotify integrations.

## Frontend data rule

Blockchain (or the Demo Ledger standing in for it) is source of truth for ownership, token ID, listing, purchase, transfer, split, and transaction status. After every successful tx the UI **refetches** — it does not invent token IDs in React state.

## Optional indexer API

`VITE_API_URL` (default `http://localhost:3001`)

- `GET /api/health`
- `GET /api/services`
- `GET /api/entitlements/:tokenId`
- `GET /api/entitlements/owner/:address`
- `GET /api/marketplace/listings`
- `GET /api/marketplace/listings/active`
- `GET /api/marketplace/listings/:tokenId`

API is convenience. Ownership and tx state always come from chain/ledger.
