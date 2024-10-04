import { ethers } from "hardhat";
import chalk from "chalk";
import { RewardDistributor__factory, ICryptoToken__factory } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(chalk.blue("Depositing rewards with the account:", chalk.green(deployer.address)));

  const rewardDistributorAddress = "0x50F23827A5d1082a227C0f6C4813890Ee3553BEf";
  const icryptoTokenAddress = "0x9742Ee81F7D6C0005FB4856660392FE618a941c0";

  // Connect to the RewardDistributor contract
  const rewardDistributor = RewardDistributor__factory.connect(rewardDistributorAddress, deployer);

  // Connect to the ICryptoToken contract
  const icryptoToken = ICryptoToken__factory.connect(icryptoTokenAddress, deployer);

  // Amount to deposit (e.g., 1000 tokens)
  const depositAmount = ethers.parseUnits("1000", 18);

  console.log(
    chalk.yellow(`Approving ${ethers.formatUnits(depositAmount, 18)} tokens for deposit...`),
  );

  // Approve the RewardDistributor to spend tokens
  const approveTx = await icryptoToken.approve(rewardDistributorAddress, depositAmount);
  await approveTx.wait();

  console.log(chalk.green("Approval successful"));

  console.log(chalk.yellow(`Depositing ${ethers.formatUnits(depositAmount, 18)} tokens...`));

  // Deposit rewards
  const depositTx = await rewardDistributor.depositRewards([icryptoTokenAddress], [depositAmount]);
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
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
