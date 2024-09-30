// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RewardDistributor.sol";
import "../src/RewardDistController.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
}

contract RewardDistributorTest is Test {
    RewardDistributor public distributor;
    RewardDistController public controller;
    MockERC20 public token1;
    MockERC20 public token2;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        controller = new RewardDistController();
        controller.initialize();

        distributor = new RewardDistributor();
        distributor.initialize(address(controller));

        token1 = new MockERC20("ICrypto Token", "ICR");
        token2 = new MockERC20("Base Token", "Base");

        // Whitelist tokens
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        uint256[] memory minAmounts = new uint256[](2);
        minAmounts[0] = 100;
        minAmounts[1] = 100;
        controller.addToWhitelist(tokens, minAmounts);

        // Set fee and fee recipient
        controller.setBribeFee(1e17); // 10%
        controller.setFeeRecipient(address(0xfee));
    }

    function testDepositRewards() public {
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;

        distributor.depositRewards(tokens, amounts);

        assertEq(token1.balanceOf(address(distributor)), 900); // 90% of deposit
        assertEq(token1.balanceOf(address(0xfee)), 100); // 10% fee
    }

    function testClaimRewards() public {
        // First, deposit some rewards
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;

        distributor.depositRewards(tokens, amounts);

        // Set up merkle root
        bytes32 merkleRoot = keccak256(abi.encodePacked(user1, address(token1), uint256(500)));
        controller.updateMerkleRoot(merkleRoot);

        // Claim rewards
        RewardDistributor.ClaimData memory claimData;
        claimData.tokens = new address[](1);
        claimData.tokens[0] = address(token1);
        claimData.points = new uint256[](1);
        claimData.points[0] = 500;
        claimData.merkleProofs = new bytes32[][](1);
        claimData.merkleProofs[0] = new bytes32[](1);
        claimData.merkleProofs[0][0] = bytes32(0);

        vm.prank(user1);
        distributor.claimRewards(claimData);

        assertEq(token1.balanceOf(user1), 500);
    }

    function testWithdrawUnusedRewards() public {
        // First, deposit some rewards
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;

        distributor.depositRewards(tokens, amounts);

        // Try to withdraw immediately (should fail)
        vm.expectRevert(RewardDistributor.WITHDRAWAL_TOO_EARLY.selector);
        distributor.withdrawUnusedRewards(tokens);

        // Fast forward 31 days
        vm.warp(block.timestamp + 31 days);

        // Now withdraw should succeed
        distributor.withdrawUnusedRewards(tokens);

        assertEq(token1.balanceOf(address(this)), 1000000 * 10**18 - 100); // Initial balance minus fee
    }

    function testCannotClaimTwice() public {
        // First, deposit some rewards
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;

        distributor.depositRewards(tokens, amounts);

        // Set up merkle root
        bytes32 merkleRoot = keccak256(abi.encodePacked(user1, address(token1), uint256(500)));
        controller.updateMerkleRoot(merkleRoot);

        // Claim rewards
        RewardDistributor.ClaimData memory claimData;
        claimData.tokens = new address[](1);
        claimData.tokens[0] = address(token1);
        claimData.points = new uint256[](1);
        claimData.points[0] = 500;
        claimData.merkleProofs = new bytes32[][](1);
        claimData.merkleProofs[0] = new bytes32[](1);
        claimData.merkleProofs[0][0] = bytes32(0);

        vm.prank(user1);
        distributor.claimRewards(claimData);

        // Try to claim again
        vm.expectRevert(RewardDistributor.HAS_CLAIMED.selector);
        vm.prank(user1);
        distributor.claimRewards(claimData);
    }

    function testCannotWithdrawAfterClaim() public {
        // First, deposit some rewards
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;

        distributor.depositRewards(tokens, amounts);

        // Set up merkle root
        bytes32 merkleRoot = keccak256(abi.encodePacked(user1, address(token1), uint256(500)));
        controller.updateMerkleRoot(merkleRoot);

        // Claim rewards
        RewardDistributor.ClaimData memory claimData;
        claimData.tokens = new address[](1);
        claimData.tokens[0] = address(token1);
        claimData.points = new uint256[](1);
        claimData.points[0] = 500;
        claimData.merkleProofs = new bytes32[][](1);
        claimData.merkleProofs[0] = new bytes32[](1);
        claimData.merkleProofs[0][0] = bytes32(0);

        vm.prank(user1);
        distributor.claimRewards(claimData);

        // Fast forward 31 days
        vm.warp(block.timestamp + 31 days);

        // Try to withdraw (should fail)
        vm.expectRevert(RewardDistributor.REWARDS_ALREADY_CLAIMED.selector);
        distributor.withdrawUnusedRewards(tokens);
    }
}