import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RewardDistributor, RewardDistController, MockERC20 } from "typechain-types";
import { claimRewardsABI, contractAddress } from "../../src/constants";
import { ContractFunctionParameters } from "viem";
import merkleTreeData from "../../src/data/merkle-tree-data.test.json";

describe("RewardDistributor Integration Tests", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let distributor: RewardDistributor;
  let controller: RewardDistController;
  let token: MockERC20;

  const user1Address = "0x071c052a78cF8dBdD4F61381596ec64078d1840B";
  const user2Address = "0xE755f77162bF252AE289482EDA6f48f4C0190306";

  beforeEach(async function () {
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

    // Use the correct address for user1 and user2
    user1 = await ethers.getImpersonatedSigner(user1Address);
    user2 = await ethers.getImpersonatedSigner(user2Address);

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = (await MockERC20Factory.deploy("ICR Token", "ICR")) as MockERC20;
    // Verify that the token has 18 decimals
    expect(await token.decimals()).to.equal(18);

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
    const initData2 = DistributorFactory.interface.encodeFunctionData("initialize", [
      await controller.getAddress(),
    ]);
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
    expect(finalDistributorBalance).to.equal(
      initialDistributorBalance + BigInt(ethers.parseEther("998")),
    ); // 998 from deposit (0.2% fee deducted)

    // Check depositor balance
    expect(finalDepositorBalance).to.equal(initialDepositorBalance - BigInt(depositAmount));

    // Check owner (fee recipient) balance
    expect(finalOwnerBalance).to.equal(initialOwnerBalance + BigInt(ethers.parseEther("2"))); // 0.2% fee
  });

  it("should allow users to claim rewards", async function () {
    const [, depositor] = await ethers.getSigners();
    const depositAmount = ethers.parseEther("2000"); // Increased to cover both claims
    const tokens = [await token.getAddress()];
    const amounts = [depositAmount];

    // Approve and deposit
    await token.connect(depositor).approve(await distributor.getAddress(), depositAmount);
    await distributor.connect(depositor).depositRewards(tokens, amounts);

    // Add funds to user1 and user2 by transferring from a funded account
    const [fundedAccount] = await ethers.getSigners();
    await fundedAccount.sendTransaction({
      to: await user1.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    await fundedAccount.sendTransaction({
      to: await user2.getAddress(),
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

    await distributor.connect(user1).claimRewards(claimDataStruct1);

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

    await distributor.connect(user2).claimRewards(claimDataStruct2);

    const user2Balance = await token.balanceOf(user2Address);
    expect(user2Balance).to.equal(claimAmount2);
  });

  it("should not allow double claiming rewards", async function () {
    const [, depositor] = await ethers.getSigners();
    const depositAmount = ethers.parseEther("2000");
    const tokens = [await token.getAddress()];
    const amounts = [depositAmount];

    // Approve and deposit
    await token.connect(depositor).approve(await distributor.getAddress(), depositAmount);
    await distributor.connect(depositor).depositRewards(tokens, amounts);

    // Add funds to user1 by transferring from a funded account
    const [fundedAccount] = await ethers.getSigners();
    await fundedAccount.sendTransaction({
      to: await user1.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    const claimData = merkleTreeData.userProofs[user1Address];

    const claimDataStruct: RewardDistributor.ClaimDataStruct = {
      tokens: claimData.tokens,
      points: claimData.points.map(p => BigInt(p)),
      merkleProofs: claimData.proofs,
    };

    // First claim should succeed
    await distributor.connect(user1).claimRewards(claimDataStruct);

    // Second claim should fail
    await expect(
      distributor.connect(user1).claimRewards(claimDataStruct),
    ).to.be.revertedWithCustomError(distributor, "HAS_CLAIMED");
  });

  it("should mimic frontend TransactionWrapper claiming process", async function () {
    const [, depositor] = await ethers.getSigners();
    const depositAmount = ethers.parseEther("2000");
    const tokens = [await token.getAddress()];
    const amounts = [depositAmount];

    // Approve and deposit
    await token.connect(depositor).approve(await distributor.getAddress(), depositAmount);
    await distributor.connect(depositor).depositRewards(tokens, amounts);

    // Add funds to user1 by transferring from a funded account
    const [fundedAccount] = await ethers.getSigners();
    await fundedAccount.sendTransaction({
      to: user1Address,
      value: ethers.parseEther("1.0"),
    });

    // Mimic the fetchMerkleProof function from TransactionWrapper
    const fetchMerkleProof = async (address: string) => {
      const proofData = merkleTreeData.userProofs[user1Address];

      if (proofData) {
        return {
          tokens: proofData.tokens,
          points: proofData.points,
          proofs: proofData.proofs,
        };
      }
      throw new Error("Merkle proof not found for user");
    };

    // Fetch merkle proof data
    const merkleProofData = await fetchMerkleProof(user1Address);

    // Prepare claim data as in TransactionWrapper
    const claimData = {
      tokens: merkleProofData.tokens,
      points: merkleProofData.points.map(p => BigInt(p)),
      merkleProofs: merkleProofData.proofs,
    };

    // Prepare contract parameters as in TransactionWrapper
    const contracts = [
      {
        address: await distributor.getAddress(),
        abi: claimRewardsABI,
        functionName: "claimRewards" as RewardDistributorFunctions,
        args: [claimData as RewardDistributor.ClaimDataStruct],
      },
    ] as unknown as ContractFunctionParameters[];

    // Use the contracts array to execute the transaction
    const contract = contracts[0];
    const tx = await user1.sendTransaction({
      to: contract.address,
      data: distributor.interface.encodeFunctionData("claimRewards", [
        claimData as RewardDistributor.ClaimDataStruct,
      ]),
    });
    // Verify the transaction hash
    const receipt = await tx.wait();
    expect(receipt?.hash).to.be.a("string");
    // console.log("Transaction hash:", receipt?.hash);

    // Verify the claim was successful
    const user1Balance = await token.balanceOf(user1Address);
    expect(user1Balance).to.equal(BigInt(merkleProofData.points[0]));

    // Attempt double claim (should fail)
    await expect(distributor.connect(user1).claimRewards(claimData)).to.be.revertedWithCustomError(
      distributor,
      "HAS_CLAIMED",
    );
  });

  type RewardDistributorFunctions = "claimRewards"; // Add other function names if needed
});
