// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IProviderAdapter.sol";

/**
 * @title MockProviderAdapter
 * @notice Simulates digital service provider API integrations for hackathon demo.
 */
contract MockProviderAdapter is IProviderAdapter, Ownable {
    // user => serviceId => remaining duration in seconds
    mapping(address => mapping(string => uint256)) private _userDuration;
    // user => serviceId => active state
    mapping(address => mapping(string => bool)) private _userActive;
    // Authorized callers (e.g. SplitXEntitlement contract, SplitXMarketplace contract)
    mapping(address => bool) public authorizedCallers;

    event ProviderProvisioned(
        address indexed user,
        string serviceId,
        uint256 duration
    );

    event ProviderDetached(
        address indexed user,
        string serviceId,
        uint256 duration
    );

    event ProviderTransferred(
        address indexed from,
        address indexed to,
        string serviceId,
        uint256 duration
    );

    event CallerAuthorized(address indexed caller, bool status);

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedCallers[msg.sender],
            "MockProviderAdapter: caller is not authorized"
        );
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Authorize or revoke calling contracts.
     */
    function setAuthorizedCaller(address caller, bool status) external onlyOwner {
        require(caller != address(0), "Invalid caller address");
        authorizedCallers[caller] = status;
        emit CallerAuthorized(caller, status);
    }

    /**
     * @inheritdoc IProviderAdapter
     */
    function provisionEntitlement(
        address user,
        string calldata serviceId,
        uint256 duration
    ) external override onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(duration > 0, "Duration must be greater than zero");

        _userDuration[user][serviceId] += duration;
        _userActive[user][serviceId] = true;

        emit ProviderProvisioned(user, serviceId, duration);
    }

    /**
     * @inheritdoc IProviderAdapter
     */
    function detachEntitlement(
        address user,
        string calldata serviceId,
        uint256 duration
    ) external override onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(duration > 0, "Duration must be greater than zero");
        uint256 current = _userDuration[user][serviceId];
        require(current >= duration, "MockProviderAdapter: insufficient duration to detach");

        _userDuration[user][serviceId] = current - duration;
        if (_userDuration[user][serviceId] == 0) {
            _userActive[user][serviceId] = false;
        }

        emit ProviderDetached(user, serviceId, duration);
    }

    /**
     * @inheritdoc IProviderAdapter
     */
    function transferEntitlement(
        address from,
        address to,
        string calldata serviceId,
        uint256 duration
    ) external override onlyAuthorized {
        require(from != address(0) && to != address(0), "Invalid address");
        require(duration > 0, "Duration must be greater than zero");
        uint256 currentFrom = _userDuration[from][serviceId];
        require(currentFrom >= duration, "MockProviderAdapter: insufficient duration on source");

        _userDuration[from][serviceId] = currentFrom - duration;
        if (_userDuration[from][serviceId] == 0) {
            _userActive[from][serviceId] = false;
        }

        _userDuration[to][serviceId] += duration;
        _userActive[to][serviceId] = true;

        emit ProviderTransferred(from, to, serviceId, duration);
    }

    /**
     * @inheritdoc IProviderAdapter
     */
    function getProviderEntitlement(
        address user,
        string calldata serviceId
    ) external view override returns (uint256 remainingDuration, bool active) {
        return (_userDuration[user][serviceId], _userActive[user][serviceId]);
    }
}
