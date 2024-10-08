import { task } from "hardhat/config";
import chalk from "chalk";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { RewardDistributor__factory, RewardDistController__factory } from "../../typechain-types";

task(
  "deploy-reward-distributor-implementation",
  "Deploy RewardDistributor and Controller implementations",
).setAction(async (_, { ethers, network, run }) => {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account found");
  }

  await run(TASK_COMPILE);

  console.log(
    chalk.blue(
      "Deploying RewardDistributor and Controller implementations with the account:",
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

  // Deploy Controller implementation
  const ControllerFactory = (await ethers.getContractFactory(
    "RewardDistController",
  )) as RewardDistController__factory;
  const controllerImpl = await ControllerFactory.deploy();
  await controllerImpl.waitForDeployment();

  console.log(
    chalk.blue(
      "Controller implementation deployed to:",
      chalk.green(await controllerImpl.getAddress()),
    ),
  );

  // Verify contracts
  if (network.name === "baseSepolia" || network.name === "base") {
    console.log(chalk.yellow("Verifying contracts..."));

    await run("verify:verify", {
      address: await distributorImpl.getAddress(),
      constructorArguments: [],
    });

    await run("verify:verify", {
      address: await controllerImpl.getAddress(),
      constructorArguments: [],
    });

    console.log(chalk.green("Contracts verified successfully."));
  }

  console.log(chalk.blue("Deployment and verification completed"));

  return {
    rewardDistributorImpl: await distributorImpl.getAddress(),
    controllerImpl: await controllerImpl.getAddress(),
  };
});

// You can run this task using: yarn hardhat deploy-reward-distributor-implementation --network baseSepolia
