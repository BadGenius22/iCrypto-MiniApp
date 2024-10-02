import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RewardDistributor, RewardDistController, MockERC20 } from "typechain-types";
import merkleTreeData from "../../data/merkle-tree-data.json";
import { Contract } from "ethers";

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
      params: [{
        forking: {
          jsonRpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
          blockNumber: 16045487
        },
      }],
    });

    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = await MockERC20Factory.deploy("ICR Token", "ICR") as MockERC20;
    // Verify that the token has 18 decimals
    expect(await token.decimals()).to.equal(18);

    // Deploy RewardDistController
    const ControllerFactory = await ethers.getContractFactory("RewardDistController");
    const controllerImp = await ControllerFactory.deploy();
    const initData = ControllerFactory.interface.encodeFunctionData("initialize");
    const proxyControllerAddress = await ethers.deployContract("TransparentUpgradeableProxy", [
        await controllerImp.getAddress(),
        await owner.getAddress(),
        initData
    ]);
    controller = ControllerFactory.attach(proxyControllerAddress) as RewardDistController;

    // Deploy RewardDistributor
    const DistributorFactory = await ethers.getContractFactory("RewardDistributor");
    const distributorImp = await DistributorFactory.deploy();
    const initData2 = DistributorFactory.interface.encodeFunctionData("initialize", [await controller.getAddress()]);
    const proxyDistributorAddress = await ethers.deployContract("TransparentUpgradeableProxy", [
        await distributorImp.getAddress(),
        await owner.getAddress(),
        initData2
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
    await token.mint(await depositor.getAddress(), ethers.parseEther("1000"));

    // Update Merkle root
    await controller.updateMerkleRoot(merkleTreeData.root);
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

  // it.only("should allow users to claim rewards", async function () {
  //   const [, depositor] = await ethers.getSigners();
  //   const depositAmount = ethers.parseEther("1000");

  //   // Approve and deposit
  //   await token.connect(depositor).approve(await distributor.getAddress(), depositAmount);

  //   const tokens = [await token.getAddress()];
  //   const amounts = [depositAmount];

  //   const user1Address = "0x071c052a78cF8dBdD4F61381596ec64078d1840B";
  //   const user1Signer = await ethers.getImpersonatedSigner(user1Address);

  //   await distributor.connect(depositor).depositRewards(tokens, amounts);
    
  //   // Fund the impersonated signer with more ETH for gas
  //   await ethers.provider.send("hardhat_setBalance", [
  //     user1Address,
  //     ethers.parseEther("1000.0").toString(), // Increased from 1.0 to 1000.0
  //   ]);
    
  //   const claimData = merkleTreeData.userProofs[user1Address];
  //   const claimAmount = ethers.parseEther(claimData.points[0].toString());

  //   const claimDataStruct: RewardDistributor.ClaimDataStruct = {
  //     tokens: claimData.tokens,
  //     points: claimData.points.map(p => ethers.parseEther(p.toString())),
  //     merkleProofs: claimData.proofs
  //   };

  //   // Ensure the distributor has enough tokens to fulfill the claim
  //   const tokenAddress = claimData.tokens[0];
  //   await token.mint(await distributor.getAddress(), claimAmount);

  //   await expect(distributor.connect(user1Signer).claimRewards(claimDataStruct))
  //     .to.emit(distributor, "RewardClaimed")
  //     .withArgs(user1Address, tokenAddress, claimAmount);

  //   const user1Balance = await token.balanceOf(user1Address);
  //   expect(user1Balance).to.equal(claimAmount);
  // });

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