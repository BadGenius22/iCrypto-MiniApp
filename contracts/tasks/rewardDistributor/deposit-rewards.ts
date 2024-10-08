import { task } from "hardhat/config";
import chalk from "chalk";
import { RewardDistributor__factory, ICryptoToken__factory } from "../../typechain-types";

task("deposit-rewards", "Deposit rewards to the RewardDistributor contract")
  .addParam("amount", "The amount of tokens to deposit")
  .addParam("seasonId", "The season ID for the deposit")
  .setAction(async (taskArgs, { ethers }) => {
    const [deployer] = await ethers.getSigners();

    const amount = taskArgs.amount;
    const seasonId = parseInt(taskArgs.seasonId, 10);

    if (isNaN(seasonId)) {
      console.error("Season ID must be a valid number");
      return;
    }

    console.log(chalk.blue("Depositing rewards with the account:", chalk.green(deployer.address)));

    const rewardDistributorAddress = "0x50F23827A5d1082a227C0f6C4813890Ee3553BEf";
    const icryptoTokenAddress = "0x9742Ee81F7D6C0005FB4856660392FE618a941c0";

    // Connect to the RewardDistributor contract
    const rewardDistributor = RewardDistributor__factory.connect(
      rewardDistributorAddress,
      deployer,
    );

    // Connect to the ICryptoToken contract
    const icryptoToken = ICryptoToken__factory.connect(icryptoTokenAddress, deployer);

    // Parse the deposit amount
    const depositAmount = ethers.parseUnits(amount, 18);

    console.log(chalk.yellow(`Approving ${amount} tokens for deposit...`));

    // Approve the RewardDistributor to spend tokens
    const approveTx = await icryptoToken.approve(rewardDistributorAddress, depositAmount);
    await approveTx.wait();

    console.log(chalk.green("Approval successful"));

    console.log(chalk.yellow(`Depositing ${amount} tokens for season ${seasonId}...`));

    // Deposit rewards
    const depositTx = await rewardDistributor.depositRewards(
      seasonId,
      [icryptoTokenAddress],
      [depositAmount],
    );
    await depositTx.wait();

    console.log(chalk.green("Deposit successful"));

    // Get updated balances
    const distributorBalance = await icryptoToken.balanceOf(rewardDistributorAddress);
    const deployerBalance = await icryptoToken.balanceOf(deployer.address);

    console.log(chalk.blue("Updated balances:"));
    console.log(
      chalk.blue(`RewardDistributor balance: ${ethers.formatUnits(distributorBalance, 18)} ICR`),
    );
    console.log(chalk.blue(`Deployer balance: ${ethers.formatUnits(deployerBalance, 18)} ICR`));
  });

// Usage: yarn hardhat deposit-rewards --amount 1000 --season-id 1 --network <your-network>
