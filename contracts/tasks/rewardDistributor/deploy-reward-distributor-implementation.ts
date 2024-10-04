import { task } from "hardhat/config";
import chalk from "chalk";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { RewardDistributor__factory } from "../../typechain-types";

task(
  "deploy-reward-distributor-implementation",
  "Deploy RewardDistributor implementation",
).setAction(async (_, { ethers, network, run }) => {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account found");
  }

  await run(TASK_COMPILE);

  console.log(
    chalk.blue(
      "Deploying RewardDistributor implementation with the account:",
      chalk.green(deployer.address),
    ),
  );

  // Deploy RewardDistributor implementation
  const RewardDistributorFactory = (await ethers.getContractFactory(
    "RewardDistributor",
  )) as RewardDistributor__factory;
  const distributorImpl = await RewardDistributorFactory.deploy();
  await distributorImpl.waitForDeployment();

  console.log(
    chalk.blue(
      "RewardDistributor implementation deployed to:",
      chalk.green(await distributorImpl.getAddress()),
    ),
  );

  // Verify contract
  if (network.name === "baseSepolia" || network.name === "base") {
    console.log(chalk.yellow("Verifying contract..."));

    await run("verify:verify", {
      address: await distributorImpl.getAddress(),
      constructorArguments: [],
    });

    console.log(chalk.green("Contract verified successfully."));
  }

  console.log(chalk.blue("Deployment and verification completed"));

  return {
    rewardDistributorImpl: await distributorImpl.getAddress(),
  };
});

// You can run this task using: yarn hardhat deploy-reward-distributor-implementation --network baseSepolia
