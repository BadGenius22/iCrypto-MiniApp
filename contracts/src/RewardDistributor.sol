// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RewardDistributor
 * @author Dewangga Praxindo
 * @notice This contract is used to distribute rewards to users based on their achievements.
 * @dev This contract is used to distribute rewards to users based on their achievements.
 */

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { IRewardDistController } from "../interfaces/IRewardDistController.sol";

contract RewardDistributor is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    struct ClaimData {
        uint256[] seasonId;
        address[] token;
        uint256[] points;
        bytes32[][] merkleProof;
    }

    // =============================================================
    //                          Events
    // =============================================================
    event RewardDeposited(
        address indexed depositor,
        address indexed tokens,
        uint256 amounts,
        uint256 seasonId,
        uint256 timestamp
    );
    event RewardClaimed(address indexed user, address indexed tokens, uint256 rewardAmounts);
    event UnusedRewardsWithdrawn(address indexed depositor, address indexed token, uint256 amount);

    // =============================================================
    //                          Errors
    // =============================================================

    error HAS_CLAIMED();
    error INVALID_PROOF();
    error INVALID_INPUT_LENGTH();
    error INVALID_VAULTS_ADDRESS();
    error INVALID_TOKENS_ADDRESS();
    error ZERO_AMOUNT();
    error TOKEN_NOT_WHITELISTED(address token);
    error BELOW_MINAMOUNT(uint256 amount);
    error NET_AMOUNT_BELOW_MIN(uint256 netBribeAmount);
    error ZERO_CONTRIBUTION();
    error INSUFFICIENT_REWARDS();
    error WITHDRAWAL_TOO_EARLY();
    error ZERO_POINTS(); // Add this new error

    // =============================================================
    //                   Mappings
    // =============================================================

    /// @notice Track the amount deposited by each user (address) for each token in each season
    mapping(uint256 => mapping(address => mapping(address => uint256))) public contributions;

    /// @notice Track the amount claimed by each user (address) for each token in each season
    mapping(uint256 => mapping(address => mapping(address => bool))) public hasClaimed;

    /// @notice Tracks the total rewards deposited for each token in each season.
    mapping(uint256 => mapping(address => uint256)) public totalDepositedRewards;

    /// @notice Records the total rewards claimed for each token in each season.
    mapping(uint256 => mapping(address => uint256)) public totalClaimedRewards;

    /// @notice Tracks the timestamp of the last deposit for each depositor and token in each season.
    mapping(uint256 => mapping(address => mapping(address => uint256))) public lastDepositTimestamp;

    // =============================================================
    //                   State Variables
    // =============================================================

    IRewardDistController private rewardDistController;
    uint256 private constant WITHDRAWAL_DELAY = 30 days;
    uint256 private constant POINTS_MULTIPLIER = 1e18;

    // =============================================================
    //                      Functions
    // =============================================================

    constructor() {
        _disableInitializers();
    }

    function initialize(address _rewardDistController) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        rewardDistController = IRewardDistController(_rewardDistController);
    }

    /* ========== VIEWS ========== */

    /**
     * @notice Calculate unclaimed rewards for a given token in a specific season.
     */
    function getUnclaimedRewards(uint256 seasonId, address token) public view returns (uint256) {
        uint256 deposited = totalDepositedRewards[seasonId][token];
        uint256 claimed = totalClaimedRewards[seasonId][token];
        return deposited > claimed ? deposited - claimed : 0;
    }

    /**
     * @notice Deposits rewards for specific tokens.
     * @dev The function deducts a fee based on the `rewardFee` and `FEE_SCALE` set in the `rewardDistController`.
     * The net reward amount (after fee deduction) must meet the minimum amount requirement for the token.
     * The fee is transferred to the fee recipient specified in `rewardDistController`.
     * @param tokens Array of token addresses for which the rewards are being deposited.
     * @param amounts Array of amounts for each token to be deposited as rewards.
     * @custom:reverts INVALID_INPUT_LENGTH if the length of tokens and amounts arrays do not match.
     * @custom:reverts ZERO_AMOUNT if any amount in the amounts array is zero.
     * @custom:reverts INVALID_TOKENS_ADDRESS if any address in the tokens array is the zero address.
     * @custom:reverts TOKEN_NOT_WHITELISTED if any token is not whitelisted.
     * @custom:reverts BELOW_MINAMOUNT if any net reward amount is below the minimum required amount for the token.
     * @custom:reverts NET_AMOUNT_BELOW_MIN if the net amount (after fee deduction) is below the minimum amount for the token.
     */
    function depositRewards(
        uint256 seasonId,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        if (tokens.length != amounts.length) revert INVALID_INPUT_LENGTH();

        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] == 0) revert ZERO_AMOUNT();
            if (tokens[i] == address(0)) revert INVALID_TOKENS_ADDRESS();

            // Ensure the token is whitelisted before proceeding.
            if (!rewardDistController.isTokenWhitelisted(tokens[i])) revert TOKEN_NOT_WHITELISTED(tokens[i]);

            // Check the minimum amount required
            if (amounts[i] < rewardDistController.getMinAmountForToken(tokens[i])) revert BELOW_MINAMOUNT(amounts[i]);

            uint256 feeAmount = (amounts[i] * rewardDistController.rewardFee()) / rewardDistController.FEE_SCALE();
            uint256 netRewardAmount = amounts[i] - feeAmount;

            if (netRewardAmount < rewardDistController.getMinAmountForToken(tokens[i]))
                revert NET_AMOUNT_BELOW_MIN(netRewardAmount);

            // Transfer feeAmount from sender to feeRecipient
            IERC20(tokens[i]).safeTransferFrom(msg.sender, rewardDistController.feeRecipient(), feeAmount);
            // Transfer netRewardAmount from sender to this contract as reward
            IERC20(tokens[i]).safeTransferFrom(msg.sender, address(this), netRewardAmount);

            // Update total deposited rewards for this season
            totalDepositedRewards[seasonId][tokens[i]] += netRewardAmount;

            // Update contributions for this season
            contributions[seasonId][tokens[i]][msg.sender] += netRewardAmount;

            // Update last deposit timestamp
            lastDepositTimestamp[seasonId][tokens[i]][msg.sender] = block.timestamp;

            // Emit an event
            emit RewardDeposited(msg.sender, tokens[i], netRewardAmount, seasonId, block.timestamp);
        }
    }

    /**
     * @notice Allows users to claim their rewards based on valid Merkle proofs for multiple tokens and points.
     * @dev This function validates the claims against a Merkle root, ensures the claims haven't been made previously, and transfers rewards based on user points.
     * @param claimData An array of ClaimData structs containing arrays of seasonIds, tokens, points, and merkle proofs for each claim.
     * @custom:reverts INVALID_INPUT_LENGTH if the lengths of seasonIds, tokens, points, and merkleProofs arrays do not match within a ClaimData struct.
     * @custom:reverts HAS_CLAIMED if the user has already claimed rewards for any of the specified tokens in a season.
     * @custom:reverts INVALID_PROOF if any of the Merkle proofs do not validate the claim against the stored Merkle root.
     * @custom:reverts INSUFFICIENT_REWARDS if the contract doesn't have enough tokens to fulfill any of the claims.
     * @custom:reverts ZERO_POINTS if any of the points values is zero.
     */
    function claimRewards(ClaimData[] calldata claimData) external nonReentrant {
        uint256 totalClaimData = claimData.length;

        for (uint256 i = 0; i < totalClaimData; i++) {
            ClaimData memory data = claimData[i];
            uint256 totalClaims = data.seasonId.length;

            // Check that all arrays in the ClaimData struct have the same length
            if (
                data.token.length != totalClaims ||
                data.points.length != totalClaims ||
                data.merkleProof.length != totalClaims
            ) {
                revert INVALID_INPUT_LENGTH();
            }

            for (uint256 j = 0; j < totalClaims; j++) {
                // Check if points are zero
                if (data.points[j] == 0) {
                    revert ZERO_POINTS();
                }

                // Check if the user has already claimed for this season and token
                if (hasClaimed[data.seasonId[j]][data.token[j]][msg.sender]) {
                    revert HAS_CLAIMED();
                }

                // Verify the Merkle proof
                bytes32 merkleRoot = rewardDistController.getMerkleRoot(data.seasonId[j]);
                bytes32 leaf = keccak256(abi.encodePacked(msg.sender, data.seasonId[j], data.token[j], data.points[j]));
                if (!MerkleProof.verify(data.merkleProof[j], merkleRoot, leaf)) {
                    revert INVALID_PROOF();
                }

                // Check if there are sufficient rewards
                uint256 totalRewards = totalDepositedRewards[data.seasonId[j]][data.token[j]];
                uint256 claimableReward = data.points[j] * POINTS_MULTIPLIER;
                if (claimableReward > totalRewards) {
                    revert INSUFFICIENT_REWARDS();
                }
            }
        }

        // If all checks pass, process the claims
        for (uint256 i = 0; i < totalClaimData; i++) {
            ClaimData memory data = claimData[i];
            uint256 totalClaims = data.seasonId.length;

            for (uint256 j = 0; j < totalClaims; j++) {
                // Mark as claimed for this season and token
                hasClaimed[data.seasonId[j]][data.token[j]][msg.sender] = true;

                uint256 claimableReward = data.points[j] * POINTS_MULTIPLIER;

                // Update total claimed rewards
                totalClaimedRewards[data.seasonId[j]][data.token[j]] += claimableReward;

                // Transfer the reward to the user
                IERC20(data.token[j]).safeTransfer(msg.sender, claimableReward);

                emit RewardClaimed(msg.sender, data.token[j], claimableReward);
            }
        }
    }

    /**
     * @notice Withdraws unclaimed rewards for specified tokens, returning them to the original depositor.
     * @dev This function allows depositors to withdraw their tokens if no user has claimed rewards yet and at least 30 days have passed since the deposit.
     * @param tokens An array of token addresses for which to withdraw unclaimed rewards.
     * @custom:reverts ZERO_CONTRIBUTION if the caller has 0 contribution or already withdrawn.
     * @custom:reverts WITHDRAWAL_TOO_EARLY if 30 days haven't passed since the last deposit for a token.
     */
    function withdrawUnusedRewards(uint256 seasonId, address[] calldata tokens) external nonReentrant {
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 depositorContribution = contributions[seasonId][tokens[i]][msg.sender];
            if (depositorContribution == 0) {
                revert ZERO_CONTRIBUTION();
            }

            // Check if 30 days have passed since the last deposit
            if (block.timestamp < lastDepositTimestamp[seasonId][tokens[i]][msg.sender] + WITHDRAWAL_DELAY) {
                revert WITHDRAWAL_TOO_EARLY();
            }

            // Subtract depositor's contribution from the total deposited rewards
            totalDepositedRewards[seasonId][tokens[i]] -= depositorContribution;

            // Reset the depositor's contribution for this token
            contributions[seasonId][tokens[i]][msg.sender] = 0;

            // Transfer the unclaimed rewards back to the depositor
            IERC20(tokens[i]).safeTransfer(msg.sender, depositorContribution);

            // Emit an event for the withdrawal
            emit UnusedRewardsWithdrawn(msg.sender, tokens[i], depositorContribution);
        }
    }
}
