// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IProviderAdapter.sol";

/**
 * @title SplitXEntitlement
 * @notice ERC-721 token representing divisible digital service entitlements.
 */
contract SplitXEntitlement is ERC721, Ownable, ReentrancyGuard {
    enum Status {
        ACTIVE,
        LISTED,
        LOCKED,
        EXPIRED,
        SOLD,
        CANCELLED
    }

    struct Entitlement {
        uint256 tokenId;
        string providerId;
        string serviceId;
        string serviceName;
        uint256 originalDuration;  // in seconds
        uint256 remainingDuration; // in seconds
        uint256 startTime;
        uint256 expiryTime;
        Status status;
        address owner;
    }

    struct Service {
        string serviceId;
        string providerId;
        string serviceName;
        uint256 pricePerDayWei;
        bool active;
        address providerWallet;
    }

    uint256 private _nextTokenId = 1;
    address public providerAdapter;
    address public marketplace;

    // tokenId => Entitlement
    mapping(uint256 => Entitlement) private _entitlements;
    // serviceId => Service
    mapping(string => Service) private _services;
    // List of all registered serviceIds
    string[] private _serviceIds;

    event EntitlementCreated(
        uint256 indexed tokenId,
        address indexed owner,
        string serviceId,
        uint256 durationDays,
        uint256 pricePaid
    );

    event EntitlementSplit(
        uint256 indexed parentTokenId,
        uint256 indexed newTokenId,
        uint256 remainingParentDuration,
        uint256 newDuration
    );

    event EntitlementLocked(uint256 indexed tokenId, address indexed owner);
    event EntitlementTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event StatusUpdated(uint256 indexed tokenId, Status status);
    event ServiceRegistered(
        string serviceId,
        string providerId,
        string serviceName,
        uint256 pricePerDayWei,
        address providerWallet
    );

    modifier onlyMarketplaceOrOwner() {
        require(
            msg.sender == marketplace || msg.sender == owner(),
            "SplitXEntitlement: caller is not marketplace or owner"
        );
        _;
    }

    constructor(address initialOwner) ERC721("SplitX Service Entitlement", "SPLITX") Ownable(initialOwner) {}

    function setProviderAdapter(address _providerAdapter) external onlyOwner {
        require(_providerAdapter != address(0), "Invalid adapter address");
        providerAdapter = _providerAdapter;
    }

    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace address");
        marketplace = _marketplace;
    }

    /**
     * @notice Register a service that users can buy entitlements for.
     */
    function registerService(
        string calldata serviceId,
        string calldata providerId,
        string calldata serviceName,
        uint256 pricePerDayWei,
        address providerWallet
    ) external onlyOwner {
        require(bytes(serviceId).length > 0, "Invalid serviceId");
        require(pricePerDayWei > 0, "Price must be > 0");
        require(providerWallet != address(0), "Invalid provider wallet");

        if (!_services[serviceId].active && bytes(_services[serviceId].serviceId).length == 0) {
            _serviceIds.push(serviceId);
        }

        _services[serviceId] = Service({
            serviceId: serviceId,
            providerId: providerId,
            serviceName: serviceName,
            pricePerDayWei: pricePerDayWei,
            active: true,
            providerWallet: providerWallet
        });

        emit ServiceRegistered(serviceId, providerId, serviceName, pricePerDayWei, providerWallet);
    }

    /**
     * @notice Get service details.
     */
    function getService(string calldata serviceId) external view returns (Service memory) {
        require(_services[serviceId].active, "Service not found or inactive");
        return _services[serviceId];
    }

    /**
     * @notice Get all registered service IDs.
     */
    function getAllServiceIds() external view returns (string[] memory) {
        return _serviceIds;
    }

    /**
     * @notice Calculate price for a service and duration in days.
     */
    function getServicePrice(string calldata serviceId, uint256 durationDays) public view returns (uint256) {
        Service memory s = _services[serviceId];
        require(s.active, "Service inactive");
        require(durationDays > 0, "Duration must be > 0");
        return s.pricePerDayWei * durationDays;
    }

    /**
     * @notice Buy a service entitlement directly from provider for exact duration (in days).
     */
    function purchaseService(string calldata serviceId, uint256 durationDays) external payable nonReentrant returns (uint256) {
        Service memory s = _services[serviceId];
        require(s.active, "Service inactive");
        require(durationDays > 0, "Duration must be > 0");

        uint256 totalPrice = getServicePrice(serviceId, durationDays);
        require(msg.value >= totalPrice, "Insufficient ETH sent");

        uint256 durationSec = durationDays * 1 days;
        uint256 tokenId = _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        _entitlements[tokenId] = Entitlement({
            tokenId: tokenId,
            providerId: s.providerId,
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            originalDuration: durationSec,
            remainingDuration: durationSec,
            startTime: block.timestamp,
            expiryTime: block.timestamp + durationSec,
            status: Status.ACTIVE,
            owner: msg.sender
        });

        // Provision via provider adapter if connected
        if (providerAdapter != address(0)) {
            IProviderAdapter(providerAdapter).provisionEntitlement(msg.sender, s.serviceId, durationSec);
        }

        // Send payment to provider wallet
        (bool sent, ) = payable(s.providerWallet).call{value: totalPrice}("");
        require(sent, "Failed to send payment to provider");

        // Refund excess ETH if any
        if (msg.value > totalPrice) {
            (bool refundSent, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(refundSent, "Refund failed");
        }

        emit EntitlementCreated(tokenId, msg.sender, serviceId, durationDays, totalPrice);
        return tokenId;
    }

    /**
     * @notice Split an existing entitlement into two separate entitlement NFTs.
     * @param tokenId ID of parent entitlement NFT.
     * @param splitDurationDays Duration in days for the newly created entitlement NFT.
     */
    function splitEntitlement(uint256 tokenId, uint256 splitDurationDays) external nonReentrant returns (uint256) {
        require(ownerOf(tokenId) == msg.sender, "SplitXEntitlement: caller is not owner");
        
        Entitlement storage parent = _entitlements[tokenId];
        require(parent.status == Status.ACTIVE, "Entitlement is not active");
        require(block.timestamp < parent.expiryTime, "Entitlement has expired");

        uint256 splitDurationSec = splitDurationDays * 1 days;
        require(splitDurationSec > 0, "Split duration must be > 0");
        require(splitDurationSec < parent.remainingDuration, "Split duration must be less than remaining duration");

        // Reduce parent remaining duration
        parent.remainingDuration -= splitDurationSec;
        parent.expiryTime = block.timestamp + parent.remainingDuration;

        // Mint child token
        uint256 newTokenId = _nextTokenId++;
        _safeMint(msg.sender, newTokenId);

        _entitlements[newTokenId] = Entitlement({
            tokenId: newTokenId,
            providerId: parent.providerId,
            serviceId: parent.serviceId,
            serviceName: parent.serviceName,
            originalDuration: splitDurationSec,
            remainingDuration: splitDurationSec,
            startTime: block.timestamp,
            expiryTime: block.timestamp + splitDurationSec,
            status: Status.ACTIVE,
            owner: msg.sender
        });

        emit EntitlementSplit(tokenId, newTokenId, parent.remainingDuration, splitDurationSec);
        return newTokenId;
    }

    /**
     * @notice Set status of an entitlement (called by marketplace or owner).
     */
    function setEntitlementStatus(uint256 tokenId, Status newStatus) external onlyMarketplaceOrOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _entitlements[tokenId].status = newStatus;
        emit StatusUpdated(tokenId, newStatus);
    }

    /**
     * @notice Update remaining duration & expiry (called when transferred/bought on marketplace).
     */
    function refreshEntitlementTime(uint256 tokenId) external onlyMarketplaceOrOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        Entitlement storage e = _entitlements[tokenId];
        e.startTime = block.timestamp;
        e.expiryTime = block.timestamp + e.remainingDuration;
    }

    /**
     * @notice Get full entitlement struct details.
     */
    function getEntitlement(uint256 tokenId) external view returns (Entitlement memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        Entitlement memory e = _entitlements[tokenId];
        e.owner = ownerOf(tokenId);

        if (e.status == Status.ACTIVE && block.timestamp >= e.expiryTime) {
            e.status = Status.EXPIRED;
        }

        return e;
    }

    /**
     * @dev Hook override to update owner in _entitlements metadata.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            _entitlements[tokenId].owner = to;
            emit EntitlementTransferred(tokenId, from, to);
        }
        return from;
    }
}
