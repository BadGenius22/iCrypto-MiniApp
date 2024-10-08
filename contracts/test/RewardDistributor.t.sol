// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RewardDistributor.sol";
import "../src/RewardDistController.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "../src/tokens/MockERC20.sol";

contract RewardDistributorTest is Test {
    RewardDistributor public distributor;
    RewardDistController public controller;
    MockERC20 public token1;
    MockERC20 public token2;
    address public owner;
    address public user1;
    address public user2;

    uint256 constant DECIMALS = 1e18;
    uint256 constant SEASON_ID = 1;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        address controllerImp = address(new RewardDistController());

        bytes memory initData = abi.encodeWithSelector(RewardDistController.initialize.selector);
        address proxyControllerAddress = address(new TransparentUpgradeableProxy(controllerImp, owner, initData));
        controller = RewardDistController(proxyControllerAddress);

        address distributorImp = address(new RewardDistributor());
        bytes memory initData2 = abi.encodeWithSelector(RewardDistributor.initialize.selector, address(controller));
        address proxyDistributorAddress = address(new TransparentUpgradeableProxy(distributorImp, owner, initData2));
        distributor = RewardDistributor(proxyDistributorAddress);

        token1 = new MockERC20("ICrypto Token", "ICR");
        token2 = new MockERC20("Base Token", "Base");

        // Mint 1000 tokens to the owner
        token1.mint(owner, 1000 * DECIMALS);
        token2.mint(owner, 1000 * DECIMALS);

        // Whitelist tokens
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        uint256[] memory minAmounts = new uint256[](2);
        minAmounts[0] = 100 * DECIMALS;
        minAmounts[1] = 100 * DECIMALS;
        controller.addToWhitelist(tokens, minAmounts);
        // Set fee and fee recipient
        controller.setRewardFee(2e15); // 0.2%
        controller.setFeeRecipient(address(0xfee));
    }

    function testDepositRewards() public {
        uint256 depositAmount = 1000 * DECIMALS;
        token1.approve(address(distributor), depositAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;

        distributor.depositRewards(SEASON_ID, tokens, amounts);

        assertEq(token1.balanceOf(address(distributor)), 998 * DECIMALS); // 99.8% of deposit
        assertEq(token1.balanceOf(address(0xfee)), 2 * DECIMALS); // 0.2% fee
    }

    function testClaimRewards() public {
        // Deposit rewards
        uint256 depositAmount = 1000 * DECIMALS;
        token1.approve(address(distributor), depositAmount);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;
        distributor.depositRewards(SEASON_ID, tokens, amounts);

        // Generate Merkle tree
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = keccak256(abi.encodePacked(user1, SEASON_ID, address(token1), uint256(500)));

        bytes32 root = keccak256(abi.encodePacked(leaves[0], leaves[0]));

        // Update Merkle root
        controller.updateMerkleRoot(SEASON_ID, root);

        // Generate Merkle proof for user1
        bytes32[] memory proofUser1 = new bytes32[](1);
        proofUser1[0] = leaves[0];

        // Claim rewards
        vm.prank(user1);
        RewardDistributor.ClaimData[] memory claimDataArray = new RewardDistributor.ClaimData[](1);
        claimDataArray[0] = RewardDistributor.ClaimData({
            seasonId: new uint256[](1),
            token: new address[](1),
            points: new uint256[](1),
            merkleProof: new bytes32[][](1)
        });
        claimDataArray[0].seasonId[0] = SEASON_ID;
        claimDataArray[0].token[0] = address(token1);
        claimDataArray[0].points[0] = 500;
        claimDataArray[0].merkleProof[0] = proofUser1;

        distributor.claimRewards(claimDataArray);

        // Verify claim
        assertEq(token1.balanceOf(user1), 500 * DECIMALS);
        assertTrue(distributor.hasClaimed(SEASON_ID, address(token1), user1));
    }

    function testWithdrawUnusedRewards() public {
        // First, deposit some rewards
        uint256 depositAmount = 1000 * DECIMALS;
        token1.approve(address(distributor), depositAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;

        distributor.depositRewards(SEASON_ID, tokens, amounts);

        // Try to withdraw immediately (should fail)
        vm.expectRevert(RewardDistributor.WITHDRAWAL_TOO_EARLY.selector);
        distributor.withdrawUnusedRewards(SEASON_ID, tokens);

        // Fast forward 31 days
        vm.warp(block.timestamp + 31 days);

        // Now withdraw should succeed
        distributor.withdrawUnusedRewards(SEASON_ID, tokens);

        assertEq(token1.balanceOf(address(this)), 998 * DECIMALS); // Initial balance minus 0.2% fee
    }

    function testCannotClaimTwice() public {
        // Deposit rewards
        uint256 depositAmount = 1000 * DECIMALS;
        token1.approve(address(distributor), depositAmount);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;
        distributor.depositRewards(SEASON_ID, tokens, amounts);

        // Generate Merkle tree
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = keccak256(abi.encodePacked(user1, SEASON_ID, address(token1), uint256(500)));

        bytes32 root = keccak256(abi.encodePacked(leaves[0], leaves[0]));

        // Update Merkle root
        controller.updateMerkleRoot(SEASON_ID, root);

        // Generate Merkle proof for user1
        bytes32[] memory proofUser1 = new bytes32[](1);
        proofUser1[0] = leaves[0];

        // Prepare claim data
        RewardDistributor.ClaimData[] memory claimDataArray = new RewardDistributor.ClaimData[](1);
        claimDataArray[0] = RewardDistributor.ClaimData({
            seasonId: new uint256[](1),
            token: new address[](1),
            points: new uint256[](1),
            merkleProof: new bytes32[][](1)
        });
        claimDataArray[0].seasonId[0] = SEASON_ID;
        claimDataArray[0].token[0] = address(token1);
        claimDataArray[0].points[0] = 500;
        claimDataArray[0].merkleProof[0] = proofUser1;

        // Claim rewards
        vm.prank(user1);
        distributor.claimRewards(claimDataArray);

        // Try to claim again
        vm.expectRevert(RewardDistributor.HAS_CLAIMED.selector);
        vm.prank(user1);
        distributor.claimRewards(claimDataArray);
    }

    function testCannotWithdrawUnusedRewards() public {
        // Deposit rewards
        uint256 depositAmount = 1000 * DECIMALS;
        token1.approve(address(distributor), depositAmount);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;
        distributor.depositRewards(SEASON_ID, tokens, amounts);

        // Generate Merkle tree
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = keccak256(abi.encodePacked(user1, SEASON_ID, address(token1), uint256(500)));

        bytes32 root = keccak256(abi.encodePacked(leaves[0], leaves[0]));

        // Update Merkle root
        controller.updateMerkleRoot(SEASON_ID, root);

        // Generate Merkle proof for user1
        bytes32[] memory proofUser1 = new bytes32[](1);
        proofUser1[0] = leaves[0];

        // Prepare claim data
        RewardDistributor.ClaimData[] memory claimDataArray = new RewardDistributor.ClaimData[](1);
        claimDataArray[0] = RewardDistributor.ClaimData({
            seasonId: new uint256[](1),
            token: new address[](1),
            points: new uint256[](1),
            merkleProof: new bytes32[][](1)
        });
        claimDataArray[0].seasonId[0] = SEASON_ID;
        claimDataArray[0].token[0] = address(token1);
        claimDataArray[0].points[0] = 500;
        claimDataArray[0].merkleProof[0] = proofUser1;

        // Claim rewards
        vm.prank(user1);
        distributor.claimRewards(claimDataArray);

        // Try to withdraw (should fail)
        vm.expectRevert(RewardDistributor.WITHDRAWAL_TOO_EARLY.selector);
        distributor.withdrawUnusedRewards(SEASON_ID, tokens);
    }
}
