// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract RewardDistController is OwnableUpgradeable {
    error INVALILD_LENGTH();
    error ALREADY_WHITELISTED(address _token);
    error NOT_WHITELISTED(address _token);
    error DIFF_LENGTH();
    error NOT_OWNER();

    event WhitelistAdded(address[] tokens, uint256[] minAmounts);
    event WhitelistEdited(address[] tokens, uint256[] minAmounts);
    event WhitelistRemoved(address[] tokens);
    event MerkleRootUpdated(uint256 indexed seasonId, bytes32 newMerkleRoot);

    // token reward -> bool
    mapping(address => bool) public whitelisted;

    // token reward -> min amount
    mapping(address => uint256) public minAmount;

    // seasonId -> merkleRoot
    mapping(uint256 => bytes32) public merkleRoot;

    // =============================================================
    //                      State Variables
    // =============================================================

    uint256 public constant FEE_SCALE = 1e18;

    uint256 public rewardFee;

    address public feeRecipient;

    address[] private rewardTokens;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
    }

    /**
     * @notice Adds a list of tokens to the whitelist with their minimum amounts.
     * @param tokens An array of token addresses to whitelist.
     * @param minAmounts An array of minimum amounts for each token, parallel to the `tokens` array.
     */
    function addToWhitelist(address[] calldata tokens, uint256[] calldata minAmounts) external onlyOwner {
        if (tokens.length != minAmounts.length) revert DIFF_LENGTH();

        for (uint256 i = 0; i < tokens.length; i++) {
            if (whitelisted[tokens[i]]) revert ALREADY_WHITELISTED(tokens[i]);
            whitelisted[tokens[i]] = true;
            minAmount[tokens[i]] = minAmounts[i];
            rewardTokens.push(tokens[i]);
        }

        emit WhitelistAdded(tokens, minAmounts);
    }

    /**
     * @notice Edit the minimum amount for whitelisted tokens.
     * @param tokens Array of token addresses to edit the minimum amounts.
     * @param newMinAmounts Array of new minimum amounts for the tokens.
     */
    function editWhitelist(address[] calldata tokens, uint256[] calldata newMinAmounts) external onlyOwner {
        if (tokens.length != newMinAmounts.length) revert DIFF_LENGTH();

        for (uint i = 0; i < tokens.length; i++) {
            if (!whitelisted[tokens[i]]) revert NOT_WHITELISTED(tokens[i]);

            // Update the minimum amount for the token
            minAmount[tokens[i]] = newMinAmounts[i];
        }

        emit WhitelistEdited(tokens, newMinAmounts);
    }

    /**
     * @notice Removes tokens from the whitelist.
     * @param tokens An array of token addresses to remove from the whitelist.
     */
    function removeFromWhitelist(address[] calldata tokens) external onlyOwner {
        if (tokens.length == 0) revert INVALILD_LENGTH();

        for (uint256 i = 0; i < tokens.length; i++) {
            if (!whitelisted[tokens[i]]) revert NOT_WHITELISTED(tokens[i]);
            delete whitelisted[tokens[i]];
            delete minAmount[tokens[i]];

            for (uint256 j = 0; j < rewardTokens.length; j++) {
                if (rewardTokens[j] == tokens[i]) {
                    rewardTokens[j] = rewardTokens[rewardTokens.length - 1]; // Swap with the last element
                    rewardTokens.pop(); // Remove the last element
                    break; // Exit the loop once the token is found and removed
                }
            }
        }

        emit WhitelistRemoved(tokens);
    }

    /**
     * @notice Gets all whitelisted reward tokens.
     * @dev This function returns the addresses of all tokens that have been whitelisted as rewards.
     * @return An array of reward token addresses.
     */
    function getAllRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }

    /**
     * @notice Checks if the specified token is whitelisted for receiving bribes.
     * @dev Determines whether a given token address is marked as whitelisted in the contract.
     * @param token The ERC20 token address to check for whitelisting.
     * @return bool Returns `true` if the token is currently whitelisted and eligible for bribing purposes; returns `false` otherwise.
     */
    function isTokenWhitelisted(address token) external view returns (bool) {
        return whitelisted[token];
    }

    /**
     * @notice Gets the minimum amount for a token.
     * @param token The address of the token.
     * @return The minimum amount for the token.
     */
    function getMinAmountForToken(address token) external view returns (uint256) {
        return minAmount[token];
    }

    function setRewardFee(uint256 newFee) external onlyOwner {
        require(newFee <= FEE_SCALE, "Invalid fee");
        rewardFee = newFee;
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        feeRecipient = recipient;
    }

    /**
     * @notice Updates the Merkle root for user reward distribution.
     * @param seasonId The seasonId to be set for the reward distribution.
     * @param newMerkleRoot The new Merkle root to be set for the reward distribution.
     * @dev This function can only be called by the contract owner. It updates the Merkle root for user reward distribution.
     * The new Merkle root replaces the previous value.
     * Emits a `MerkleRootUpdated` event for the update.
     */
    function updateMerkleRoot(uint256 seasonId, bytes32 newMerkleRoot) external onlyOwner {
        merkleRoot[seasonId] = newMerkleRoot;

        emit MerkleRootUpdated(seasonId, newMerkleRoot);
    }

    /**
     * @notice Gets the Merkle root for a given seasonId.
     * @param seasonId The seasonId to get the Merkle root for.
     * @return The Merkle root for the given seasonId.
     */
    function getMerkleRoot(uint256 seasonId) external view returns (bytes32) {
        return merkleRoot[seasonId];
    }
}
