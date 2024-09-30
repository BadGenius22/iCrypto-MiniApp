// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RewardDistributor.sol";
import "../src/RewardDistController.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { TransparentUpgradeableProxy } from '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000);
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

        address controllerImp = address(new RewardDistController());
   

        bytes memory initData = abi.encodeWithSelector(RewardDistController.initialize.selector);
        address proxyControllerAddress = address(
            new TransparentUpgradeableProxy(controllerImp, owner, initData)
        );
        controller = RewardDistController(proxyControllerAddress);

        address distributorImp = address(new RewardDistributor());
        bytes memory initData2 = abi.encodeWithSelector(RewardDistributor.initialize.selector, address(controller));
        address proxyDistributorAddress = address(
            new TransparentUpgradeableProxy(distributorImp, owner, initData2)
        );
        distributor = RewardDistributor(proxyDistributorAddress);

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
        controller.setBribeFee(2e15); // 0.2%
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

        assertEq(token1.balanceOf(address(distributor)), 998); // 99.8% of deposit
        assertEq(token1.balanceOf(address(0xfee)), 2); // 0.2% fee
    }

    function testClaimRewards() public {
        // Deposit rewards
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;
        distributor.depositRewards(tokens, amounts);

        // Generate Merkle tree
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = keccak256(abi.encodePacked(user1, address(token1), uint256(500)));      

        bytes32 root = keccak256(abi.encodePacked(leaves[0], leaves[0]));   

        // Update Merkle root
        controller.updateMerkleRoot(root);

        // Generate Merkle proof for user1
        bytes32[] memory proofUser1 = new bytes32[](1);
        proofUser1[0] = leaves[0];

        // Claim rewards
        vm.prank(user1);
        address[] memory claimTokens = new address[](1);
        claimTokens[0] = address(token1);
        uint256[] memory claimPoints = new uint256[](1);
        claimPoints[0] = 500;
        bytes32[][] memory proofs = new bytes32[][](1);
        proofs[0] = proofUser1;
        distributor.claimRewards(RewardDistributor.ClaimData({
            tokens: claimTokens,
            points: claimPoints,
            merkleProofs: proofs
        }));

        // Verify claim
        assertEq(token1.balanceOf(user1), 500);
        assertEq(distributor.hasClaimed(address(token1), user1), true);
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

        assertEq(token1.balanceOf(address(this)), 998); // Initial balance minus 0.2% fee
    }

    function testCannotClaimTwice() public {
        // Deposit rewards
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;
        distributor.depositRewards(tokens, amounts);

        // Generate Merkle tree
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = keccak256(abi.encodePacked(user1, address(token1), uint256(500)));      

        bytes32 root = keccak256(abi.encodePacked(leaves[0], leaves[0]));   

        // Update Merkle root
        controller.updateMerkleRoot(root);

        // Generate Merkle proof for user1
        bytes32[] memory proofUser1 = new bytes32[](1);
        proofUser1[0] = leaves[0];

        // Claim rewards
        vm.prank(user1);
        address[] memory claimTokens = new address[](1);
        claimTokens[0] = address(token1);
        uint256[] memory claimPoints = new uint256[](1);
        claimPoints[0] = 500;
        bytes32[][] memory proofs = new bytes32[][](1);
        proofs[0] = proofUser1;
        distributor.claimRewards(RewardDistributor.ClaimData({
            tokens: claimTokens,
            points: claimPoints,
            merkleProofs: proofs
        }));
        // Try to claim again
        vm.expectRevert(RewardDistributor.HAS_CLAIMED.selector);
        vm.prank(user1);
         distributor.claimRewards(RewardDistributor.ClaimData({
            tokens: claimTokens,
            points: claimPoints,
            merkleProofs: proofs
        }));
    }

    function testCannotWithdrawAfterClaim() public {
         // Deposit rewards
        uint256 depositAmount = 1000;
        token1.approve(address(distributor), depositAmount);
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = depositAmount;
        distributor.depositRewards(tokens, amounts);

        // Generate Merkle tree
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = keccak256(abi.encodePacked(user1, address(token1), uint256(500)));      

        bytes32 root = keccak256(abi.encodePacked(leaves[0], leaves[0]));   

        // Update Merkle root
        controller.updateMerkleRoot(root);

        // Generate Merkle proof for user1
        bytes32[] memory proofUser1 = new bytes32[](1);
        proofUser1[0] = leaves[0];

        // Claim rewards
        vm.prank(user1);
        address[] memory claimTokens = new address[](1);
        claimTokens[0] = address(token1);
        uint256[] memory claimPoints = new uint256[](1);
        claimPoints[0] = 500;
        bytes32[][] memory proofs = new bytes32[][](1);
        proofs[0] = proofUser1;
        distributor.claimRewards(RewardDistributor.ClaimData({
            tokens: claimTokens,
            points: claimPoints,
            merkleProofs: proofs
        }));

        // Fast forward 31 days
        vm.warp(block.timestamp + 31 days);

        // Try to withdraw (should fail)
        vm.expectRevert(RewardDistributor.REWARDS_ALREADY_CLAIMED.selector);
        distributor.withdrawUnusedRewards(tokens);
    }
}

