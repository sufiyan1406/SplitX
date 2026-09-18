// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IProviderAdapter
 * @notice Standard interface for digital service provider integrations.
 */
interface IProviderAdapter {
    /**
     * @notice Provision service access to a user.
     * @param user Address of the user receiving service access.
     * @param serviceId Identifier of the service.
     * @param duration Duration of access in seconds.
     */
    function provisionEntitlement(
        address user,
        string calldata serviceId,
        uint256 duration
    ) external;

    /**
     * @notice Detach service access from a user (e.g. when listed or sold).
     * @param user Address of the user whose service access is detached.
     * @param serviceId Identifier of the service.
     * @param duration Duration of access to detach in seconds.
     */
    function detachEntitlement(
        address user,
        string calldata serviceId,
        uint256 duration
    ) external;

    /**
     * @notice Transfer service access directly between users.
     * @param from Address releasing service access.
     * @param to Address acquiring service access.
     * @param serviceId Identifier of the service.
     * @param duration Duration of access in seconds.
     */
    function transferEntitlement(
        address from,
        address to,
        string calldata serviceId,
        uint256 duration
    ) external;

    /**
     * @notice Query active provider entitlement details for a user.
     * @param user Address of the user.
     * @param serviceId Identifier of the service.
     * @return remainingDuration Duration remaining in seconds.
     * @return active True if the entitlement is currently active.
     */
    function getProviderEntitlement(
        address user,
        string calldata serviceId
    ) external view returns (uint256 remainingDuration, bool active);
}
