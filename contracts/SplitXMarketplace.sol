// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SplitXEntitlement.sol";
import "./interfaces/IProviderAdapter.sol";

/**
 * @title SplitXMarketplace
 * @notice Fixed-price marketplace and escrow for SplitX entitlement NFTs.
 * Automatically detaches seller service access upon listing and provisions buyer upon purchase.
 */
contract SplitXMarketplace is IERC721Receiver, Ownable, ReentrancyGuard {
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 priceWei;
        uint256 listedAt;
        bool active;
    }

    SplitXEntitlement public entitlementContract;
    IProviderAdapter public providerAdapter;

    address public platformWallet;
    uint256 public platformFeeBps = 500; // 5%
    uint256 public providerFeeBps = 500; // 5%
    uint256 public constant BPS_DENOMINATOR = 10000;

    // tokenId => Listing
    mapping(uint256 => Listing) private _listings;
    uint256[] private _listedTokenIds;

    event EntitlementListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 priceWei
    );

    event ListingCancelled(
        uint256 indexed tokenId,
        address indexed seller
    );

    event EntitlementPurchased(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 priceWei
    );

    event FeeConfigUpdated(
        uint256 platformFeeBps,
        uint256 providerFeeBps,
        address platformWallet
    );

    constructor(
        address initialOwner,
        address payable _entitlementContract,
        address _providerAdapter,
        address _platformWallet
    ) Ownable(initialOwner) {
        require(_entitlementContract != address(0), "Invalid entitlement contract");
        require(_providerAdapter != address(0), "Invalid adapter contract");
        require(_platformWallet != address(0), "Invalid platform wallet");

        entitlementContract = SplitXEntitlement(_entitlementContract);
        providerAdapter = IProviderAdapter(_providerAdapter);
        platformWallet = _platformWallet;
    }

    /**
     * @notice Configure fee percentages and platform wallet.
     */
    function setFeeConfig(
        uint256 _platformFeeBps,
        uint256 _providerFeeBps,
        address _platformWallet
    ) external onlyOwner {
        require(_platformFeeBps + _providerFeeBps <= BPS_DENOMINATOR, "Fees exceed 100%");
        require(_platformWallet != address(0), "Invalid platform wallet");

        platformFeeBps = _platformFeeBps;
        providerFeeBps = _providerFeeBps;
        platformWallet = _platformWallet;

        emit FeeConfigUpdated(_platformFeeBps, _providerFeeBps, _platformWallet);
    }

    /**
     * @notice List an entitlement NFT for sale on SplitX Marketplace.
     * Escrows the NFT and detaches service access from seller.
     */
    function listEntitlement(uint256 tokenId, uint256 priceWei) external nonReentrant {
        require(priceWei > 0, "Price must be > 0");
        require(entitlementContract.ownerOf(tokenId) == msg.sender, "Caller is not token owner");

        SplitXEntitlement.Entitlement memory e = entitlementContract.getEntitlement(tokenId);
        require(block.timestamp < e.expiryTime, "Token has expired");
        require(e.status == SplitXEntitlement.Status.ACTIVE, "Token is not active");

        // Escrow NFT in Marketplace
        entitlementContract.safeTransferFrom(msg.sender, address(this), tokenId);

        // Update status in entitlement contract to LISTED
        entitlementContract.setEntitlementStatus(tokenId, SplitXEntitlement.Status.LISTED);

        // Detach provider service access from seller
        if (address(providerAdapter) != address(0)) {
            providerAdapter.detachEntitlement(msg.sender, e.serviceId, e.remainingDuration);
        }

        if (!_listings[tokenId].active && _listings[tokenId].listedAt == 0) {
            _listedTokenIds.push(tokenId);
        }

        _listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            priceWei: priceWei,
            listedAt: block.timestamp,
            active: true
        });

        emit EntitlementListed(tokenId, msg.sender, priceWei);
    }

    /**
     * @notice Cancel an active entitlement listing.
     * Returns NFT to seller and re-provisions service access.
     */
    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing storage listing = _listings[tokenId];
        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender, "Caller is not listing seller");

        listing.active = false;

        // Reset entitlement status to ACTIVE
        entitlementContract.setEntitlementStatus(tokenId, SplitXEntitlement.Status.ACTIVE);

        // Return NFT to seller
        entitlementContract.safeTransferFrom(address(this), msg.sender, tokenId);

        // Re-provision service access to seller
        SplitXEntitlement.Entitlement memory e = entitlementContract.getEntitlement(tokenId);
        if (address(providerAdapter) != address(0)) {
            providerAdapter.provisionEntitlement(msg.sender, e.serviceId, e.remainingDuration);
        }

        emit ListingCancelled(tokenId, msg.sender);
    }

    /**
     * @notice Purchase a listed entitlement NFT.
     * Transfers ETH (splitting seller, provider, platform shares), transfers NFT, and provisions buyer.
     */
    function buyEntitlement(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = _listings[tokenId];
        require(listing.active, "Listing is not active");
        require(msg.value == listing.priceWei, "Exact payment amount required");

        SplitXEntitlement.Entitlement memory e = entitlementContract.getEntitlement(tokenId);
        require(block.timestamp < e.expiryTime, "Listed entitlement has expired");

        address seller = listing.seller;
        uint256 price = listing.priceWei;

        listing.active = false;

        // Calculate fee shares
        uint256 platformShare = (price * platformFeeBps) / BPS_DENOMINATOR;
        uint256 providerShare = (price * providerFeeBps) / BPS_DENOMINATOR;
        uint256 sellerShare = price - platformShare - providerShare;

        // Get provider wallet address
        SplitXEntitlement.Service memory s = entitlementContract.getService(e.serviceId);
        address providerWallet = s.providerWallet;

        // Transfer funds
        (bool sellerPaid, ) = payable(seller).call{value: sellerShare}("");
        require(sellerPaid, "Failed to pay seller");

        if (platformShare > 0) {
            (bool platformPaid, ) = payable(platformWallet).call{value: platformShare}("");
            require(platformPaid, "Failed to pay platform fee");
        }

        if (providerShare > 0 && providerWallet != address(0)) {
            (bool providerPaid, ) = payable(providerWallet).call{value: providerShare}("");
            require(providerPaid, "Failed to pay provider fee");
        }

        // Set status to ACTIVE and refresh duration/expiry for buyer
        entitlementContract.setEntitlementStatus(tokenId, SplitXEntitlement.Status.ACTIVE);
        entitlementContract.refreshEntitlementTime(tokenId);

        // Transfer NFT to buyer
        entitlementContract.safeTransferFrom(address(this), msg.sender, tokenId);

        // Provision service access to buyer
        if (address(providerAdapter) != address(0)) {
            providerAdapter.provisionEntitlement(msg.sender, e.serviceId, e.remainingDuration);
        }

        emit EntitlementPurchased(tokenId, seller, msg.sender, price);
    }

    /**
     * @notice Fetch listing details.
     */
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        require(_listings[tokenId].listedAt > 0, "Listing does not exist");
        return _listings[tokenId];
    }

    /**
     * @notice Check if token is actively listed.
     */
    function isListed(uint256 tokenId) external view returns (bool) {
        return _listings[tokenId].active;
    }

    /**
     * @notice Fetch all active listings.
     */
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            if (_listings[_listedTokenIds[i]].active) {
                activeCount++;
            }
        }

        Listing[] memory result = new Listing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            uint256 tid = _listedTokenIds[i];
            if (_listings[tid].active) {
                result[index] = _listings[tid];
                index++;
            }
        }
        return result;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
