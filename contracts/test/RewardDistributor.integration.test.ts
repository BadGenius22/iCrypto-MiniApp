import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RewardDistributor, RewardDistController, MockERC20 } from "typechain-types";
import merkleTreeData from "../../data/merkle-tree-data.json";
import { Contract } from "ethers";
import { encodePacked, keccak256 } from "viem";

describe("RewardDistributor Integration Tests", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let distributor: RewardDistributor;
  let controller: RewardDistController;
  let token: MockERC20;

  before(async function () {
    // Switch to Base Sepolia network
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
            blockNumber: 20538146,
          },
        },
      ],
    });

    [owner] = await ethers.getSigners();

    // Use the correct address for user1
    user1 = await ethers.getImpersonatedSigner("0x071c052a78cF8dBdD4F61381596ec64078d1840B");
    user2 = await ethers.getImpersonatedSigner("0xE755f77162bF252AE289482EDA6f48f4C0190306");

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = (await MockERC20Factory.deploy("ICR Token", "ICR")) as MockERC20;
    // Verify that the token has 18 decimals
    expect(await token.decimals()).to.equal(18);
    const tokenAddress = await token.getAddress();
    console.log("Token deployed at:", tokenAddress);

    // Deploy RewardDistController
    const ControllerFactory = await ethers.getContractFactory("RewardDistController");
    const controllerImp = await ControllerFactory.deploy();
    const initData = ControllerFactory.interface.encodeFunctionData("initialize");
    const proxyControllerAddress = await ethers.deployContract("TransparentUpgradeableProxy", [
      await controllerImp.getAddress(),
      await owner.getAddress(),
      initData,
    ]);
    controller = ControllerFactory.attach(proxyControllerAddress) as RewardDistController;

    // Deploy RewardDistributor
    const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
    const distributorImp = await DistributorFactory.deploy();
    const initData2 = DistributorFactory.interface.encodeFunctionData("initialize", [await controller.getAddress()]);
    const proxyDistributorAddress = await ethers.deployContract("TransparentUpgradeableProxy", [
      await distributorImp.getAddress(),
      await owner.getAddress(),
      initData2,
    ]);
    distributor = DistributorFactory.attach(proxyDistributorAddress) as RewardDistributor;

    // Whitelist token
    await controller.addToWhitelist([await token.getAddress()], [ethers.parseEther("100")]);
    // Set fee and fee recipient
    await controller.setRewardFee(ethers.parseEther("0.002")); // 0.2%
    await controller.setFeeRecipient(await owner.getAddress());

    // Mint tokens to owner and depositor
    await token.mint(await owner.getAddress(), ethers.parseEther("10000"));
    const [, depositor] = await ethers.getSigners();
    await token.mint(await depositor.getAddress(), ethers.parseEther("5000"));

    // Update Merkle root
    await controller.updateMerkleRoot(merkleTreeData.root);
    // Verify that the contract has the correct Merkle root
    const contractRoot = await controller.getMerkleRoot();
    console.log("Contract Merkle Root:", contractRoot);
  });

  it("should deposit rewards and collect fees correctly", async function () {
    const [, depositor] = await ethers.getSigners();
    const depositAmount = ethers.parseEther("1000");

    // Approve and deposit
    await token.connect(depositor).approve(await distributor.getAddress(), depositAmount);

    const tokens = [await token.getAddress()];
    const amounts = [depositAmount];

    const initialDistributorBalance = await token.balanceOf(await distributor.getAddress());
    const initialDepositorBalance = await token.balanceOf(await depositor.getAddress());
    const initialOwnerBalance = await token.balanceOf(await owner.getAddress());

    await distributor.connect(depositor).depositRewards(tokens, amounts);

    const finalDistributorBalance = await token.balanceOf(await distributor.getAddress());
    const finalDepositorBalance = await token.balanceOf(await depositor.getAddress());
    const finalOwnerBalance = await token.balanceOf(await owner.getAddress());

    // Check distributor balance
    expect(finalDistributorBalance).to.equal(initialDistributorBalance + BigInt(ethers.parseEther("998"))); // 998 from deposit (0.2% fee deducted)

    // Check depositor balance
    expect(finalDepositorBalance).to.equal(initialDepositorBalance - BigInt(depositAmount));

    // Check owner (fee recipient) balance
    expect(finalOwnerBalance).to.equal(initialOwnerBalance + BigInt(ethers.parseEther("2"))); // 0.2% fee
  });

  it.only("should allow users to claim rewards", async function () {
    const [, depositor] = await ethers.getSigners();
    const depositAmount = ethers.parseEther("2000"); // Increased to cover both claims
    const tokens = [await token.getAddress()];
    const amounts = [depositAmount];

    // Approve and deposit
    await token.connect(depositor).approve(await distributor.getAddress(), depositAmount);
    await distributor.connect(depositor).depositRewards(tokens, amounts);

    const user1Address = "0x071c052a78cF8dBdD4F61381596ec64078d1840B";
    const user2Address = "0xE755f77162bF252AE289482EDA6f48f4C0190306";
    const user1Signer = await ethers.getImpersonatedSigner(user1Address);
    const user2Signer = await ethers.getImpersonatedSigner(user2Address);

    // Add funds to user1 and user2 by transferring from a funded account
    const [fundedAccount] = await ethers.getSigners();
    await fundedAccount.sendTransaction({
      to: user1Address,
      value: ethers.parseEther("1.0"),
    });
    await fundedAccount.sendTransaction({
      to: user2Address,
      value: ethers.parseEther("1.0"),
    });

    // User 1 claim
    const claimData1 = merkleTreeData.userProofs[user1Address];
    const claimAmount1 = BigInt(claimData1.points[0]);

    const claimDataStruct1: RewardDistributor.ClaimDataStruct = {
      tokens: claimData1.tokens,
      points: claimData1.points.map(p => BigInt(p)),
      merkleProofs: claimData1.proofs,
    };

    await distributor.connect(user1Signer).claimRewards(claimDataStruct1);

    const user1Balance = await token.balanceOf(user1Address);
    expect(user1Balance).to.equal(claimAmount1);

    // User 2 claim
    const claimData2 = merkleTreeData.userProofs[user2Address];
    const claimAmount2 = BigInt(claimData2.points[0]);

    const claimDataStruct2: RewardDistributor.ClaimDataStruct = {
      tokens: claimData2.tokens,
      points: claimData2.points.map(p => BigInt(p)),
      merkleProofs: claimData2.proofs,
    };

    await distributor.connect(user2Signer).claimRewards(claimDataStruct2);

    const user2Balance = await token.balanceOf(user2Address);
    expect(user2Balance).to.equal(claimAmount2);
  });

  // it("should not allow double claiming", async function () {
  //   const user1Address = "0x071c052a78cF8dBdD4F61381596ec64078d1840B";
  //   const user1Signer = await ethers.getImpersonatedSigner(user1Address);

  //   const claimData = merkleTreeData.userProofs[user1Address];

  //   await expect(distributor.connect(user1Signer).claimRewards({
  //     tokens: claimData.tokens,
  //     points: claimData.points.map(p => ethers.parseEther(p.toString())),
  //     merkleProofs: claimData.proofs
  //   })).to.be.revertedWithCustomError(distributor, "HAS_CLAIMED");
  // });

  // it("should allow withdrawal of unused rewards after 30 days", async function () {
  //   await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
  //   await network.provider.send("evm_mine");

  //   const initialBalance = await token.balanceOf(await owner.getAddress());
  //   await distributor.withdrawUnusedRewards([await token.getAddress()]);
  //   const finalBalance = await token.balanceOf(await owner.getAddress());

  //   expect(finalBalance).to.be.gt(initialBalance);
  // });
});

// Add this helper function to verify the Merkle proof
function verifyMerkleProof(proof: string[], root: string, leaf: string): boolean {
  let computedHash = leaf;
  for (const proofElement of proof) {
    if (computedHash < proofElement) {
      computedHash = keccak256(encodePacked(["bytes32", "bytes32"], [computedHash, proofElement]));
    } else {
      computedHash = keccak256(encodePacked(["bytes32", "bytes32"], [proofElement, computedHash]));
    }
  }
  return computedHash === root;
}
