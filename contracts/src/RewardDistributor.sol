// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RewardDistributor
 * @author Dewangga Praxindo
 * @notice This contract is used to distribute rewards to users based on their achievements.   
 * @dev This contract is used to distribute rewards to users based on their achievements.
 */

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import { ReentrancyGuardUpgradeable } from '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import { MerkleProof } from '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import { IRewardDistController } from '../interfaces/IRewardDistController.sol'; 

contract RewardDistributor is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    struct ClaimData {
        address[] tokens;
        uint256[] points;
        bytes32[][] merkleProofs;
    }

    // =============================================================
    //                          Events
    // =============================================================
    event RewardDeposited(
        address indexed depositor,
        address indexed vault,
        address indexed tokens,
        uint256 amounts,
        uint256 epoch
    );
    event RewardClaimed(address indexed user, address indexed tokens, uint256 rewardAmounts);
    event UnusedRewardsWithdrawn(
        address indexed depositor,
        address indexed token,
        uint256 amount
    );

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
    error REWARDS_ALREADY_CLAIMED();
    error WITHDRAWAL_TOO_EARLY();

    // =============================================================
    //                   Mappings
    // =============================================================

    /// @notice Track the amount deposited by each user (address) for each token
    mapping(address => mapping(address => uint256)) public contributions;

    /// @notice Records whether a claim has been made for a specific combination of user and token.
    mapping(address => mapping(address => bool)) public hasClaimed;

    /// @notice Tracks the total rewards deposited for each token.
    mapping(address => uint256) public totalDepositedRewards;

    /// @notice Records the total rewards claimed for each token.
    mapping(address => uint256) public totalClaimedRewards;

    /// @notice Tracks the timestamp of the last deposit for each depositor and token.
    mapping(address => mapping(address => uint256)) public lastDepositTimestamp;

    // =============================================================
    //                   State Variables
    // =============================================================

    IRewardDistController private rewardDistController;
    uint256 private constant WITHDRAWAL_DELAY = 30 days;

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
     * @notice Calculate unclaimed rewards for a given token.
     */
    function getUnclaimedRewards(address token) public view returns (uint256) {
        uint256 deposited = totalDepositedRewards[token];
        uint256 claimed = totalClaimedRewards[token];
        return deposited > claimed ? deposited - claimed : 0;
    }


    /**
     * @notice Deposits rewards for specific tokens.
     * @dev The function deducts a fee based on the `bribeFee` and `FEE_SCALE` set in the `rewardDistController`.
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

            uint256 feeAmount = (amounts[i] * rewardDistController.bribeFee()) / rewardDistController.FEE_SCALE();
            uint256 netRewardAmount = amounts[i] - feeAmount;

            if (netRewardAmount < rewardDistController.getMinAmountForToken(tokens[i]))
                revert NET_AMOUNT_BELOW_MIN(netRewardAmount);

            // Transfer feeAmount from sender to feeRecipient
            IERC20(tokens[i]).safeTransferFrom(msg.sender, rewardDistController.feeRecipient(), feeAmount);
            // Transfer netRewardAmount from sender to this contract as reward
            IERC20(tokens[i]).safeTransferFrom(msg.sender, address(this), netRewardAmount);

            // Update total deposited rewards
            totalDepositedRewards[tokens[i]] += netRewardAmount;

            // Update contributions
            contributions[tokens[i]][msg.sender] += netRewardAmount;

            // Update last deposit timestamp
            lastDepositTimestamp[tokens[i]][msg.sender] = block.timestamp;

            // Emit an event
            emit RewardDeposited(msg.sender, address(this), tokens[i], netRewardAmount, block.timestamp);
        }
    }

    /**
     * @notice Allows users to claim their rewards based on valid Merkle proofs for multiple tokens and points.
     * @dev This function validates the claims against a Merkle root, ensures the claims haven't been made previously, and transfers rewards based on user points.
     * @param claimData A struct containing arrays of tokens, points, and merkle proofs for each claim.
     * @custom:reverts INVALID_INPUT_LENGTH if the lengths of tokens, points, and merkleProofs arrays do not match.
     * @custom:reverts HAS_CLAIMED if the user has already claimed rewards for any of the specified tokens.
     * @custom:reverts INVALID_PROOF if any of the Merkle proofs do not validate the claim against the stored Merkle root.
     * @custom:reverts INSUFFICIENT_REWARDS if the contract doesn't have enough tokens to fulfill any of the claims.
     */
    function claimRewards(ClaimData calldata claimData) external nonReentrant {
        if (
            claimData.tokens.length != claimData.points.length ||
            claimData.tokens.length != claimData.merkleProofs.length
        ) revert INVALID_INPUT_LENGTH();

        // Fetch the merkleRoot
        bytes32 merkleRoot = rewardDistController.getMerkleRoot();

        for (uint256 i = 0; i < claimData.tokens.length; i++) {
            address token = claimData.tokens[i];
            uint256 points = claimData.points[i];
            bytes32[] memory merkleProof = claimData.merkleProofs[i];

            // Check if the user has already claimed for this token
            if (hasClaimed[token][msg.sender]) {
                revert HAS_CLAIMED();
            }

            bytes32 leaf = keccak256(abi.encodePacked(msg.sender, token, points));
            if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) revert INVALID_PROOF();

            // Mark as claimed for this token
            hasClaimed[token][msg.sender] = true;

            uint256 totalRewards = totalDepositedRewards[token];
            uint256 claimableReward = points;
            
            // Ensure the contract has enough tokens to fulfill the claim
            if (claimableReward > totalRewards) revert INSUFFICIENT_REWARDS();

            // Update total claimed rewards
            totalClaimedRewards[token] += claimableReward;

            // Transfer the reward to the user
            IERC20(token).safeTransfer(msg.sender, claimableReward);

            emit RewardClaimed(msg.sender, token, claimableReward);
        }
    }

    /**
     * @notice Withdraws unclaimed rewards for specified tokens, returning them to the original depositor.
     * @dev This function allows depositors to withdraw their tokens if no user has claimed rewards yet and at least 30 days have passed since the deposit.
     * @param tokens An array of token addresses for which to withdraw unclaimed rewards.
     * @custom:reverts ZERO_CONTRIBUTION if the caller has 0 contribution or already withdrawn.
     * @custom:reverts REWARDS_ALREADY_CLAIMED if any user has already claimed rewards for the specified token.
     * @custom:reverts WITHDRAWAL_TOO_EARLY if 30 days haven't passed since the last deposit for a token.
     */
    function withdrawUnusedRewards(
        address[] calldata tokens
    ) external nonReentrant {
        // Iterate through each token
        for (uint256 i = 0; i < tokens.length; i++) {
    
            uint256 depositorContribution = contributions[tokens[i]][msg.sender];
            if (depositorContribution == 0) {
                revert ZERO_CONTRIBUTION();
            }

            // Check if any rewards have been claimed
            if (totalClaimedRewards[tokens[i]] > 0) {
                revert REWARDS_ALREADY_CLAIMED();
            }

            // Check if 30 days have passed since the last deposit
            if (block.timestamp < lastDepositTimestamp[tokens[i]][msg.sender] + WITHDRAWAL_DELAY) {
                revert WITHDRAWAL_TOO_EARLY();
            }

            // Subtract depositor's contribution from the total deposited rewards
            totalDepositedRewards[tokens[i]] -= depositorContribution;

            // Reset the depositor's contribution for this token
            contributions[tokens[i]][msg.sender] = 0;

            // Transfer the unclaimed rewards back to the depositor
            IERC20(tokens[i]).safeTransfer(msg.sender, depositorContribution);

            // Emit an event for the withdrawal
            emit UnusedRewardsWithdrawn(msg.sender, tokens[i], depositorContribution);
        }
    }
}