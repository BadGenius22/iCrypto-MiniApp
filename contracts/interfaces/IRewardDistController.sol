// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRewardDistController {
    function isTokenWhitelisted(address token) external view returns (bool);

    function isVaultWhitelisted(address vault) external view returns (bool);

    function getMinAmountForToken(address token) external view returns (uint256);

    function getMerkleRoot() external view returns (bytes32);

    function version() external pure returns (string memory);

    function feeRecipient() external view returns (address);

    function FEE_SCALE() external view returns (uint256);

    function bribeFee() external view returns (uint256);
}
