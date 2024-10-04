import { task, types } from "hardhat/config";
import chalk from "chalk";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import {
  RewardDistController__factory,
  RewardDistController,
  RewardDistributor__factory,
  RewardDistributor,
} from "../../typechain-types";

task("deploy-reward-distributor", "Deploy and verify RewardDistController and RewardDistributor")
  .addParam("fee", "fee percentage", 0, types.float)
  .setAction(async ({ fee }, { ethers, upgrades, network, run }) => {
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
      throw new Error("No deployer account found");
    }
    const feerecipient = "0x24A10662B6B62A27D0666Bc97cd4c53Feec90130";
    await run(TASK_COMPILE);

    console.log(chalk.blue("Deploying contracts with the account:", chalk.green(deployer.address)));

    // Check if fee is within valid range
    if (fee < 0 || fee > 100) {
      throw new Error(
        "Fee must be between 0 and 100 percent (can include decimals, e.g., 0.2 for 0.2%)",
      );
    }

    // Deploy RewardDistController implementation
    const RewardDistControllerFactory = (await ethers.getContractFactory(
      "RewardDistController",
    )) as RewardDistController__factory;
    const controllerImpl = await RewardDistControllerFactory.deploy();
    await controllerImpl.waitForDeployment();

    // Deploy RewardDistributor implementation
    const RewardDistributorFactory = (await ethers.getContractFactory(
      "RewardDistributor",
    )) as RewardDistributor__factory;
    const distributorImpl = await RewardDistributorFactory.deploy();
    await distributorImpl.waitForDeployment();

    // Initialize data for RewardDistController
    const controllerInitData = RewardDistControllerFactory.interface.encodeFunctionData(
      "initialize",
      [],
    );

    // Deploy the proxy for RewardDistController
    const TransparentUpgradeableProxy = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );
    const proxyController = await TransparentUpgradeableProxy.deploy(
      await controllerImpl.getAddress(),
      deployer.address,
      controllerInitData,
    );
    await proxyController.waitForDeployment();

    // Connect to the proxy as RewardDistController
    const controller = RewardDistControllerFactory.attach(
      await proxyController.getAddress(),
    ) as RewardDistController;

    // Prepare initialization data for RewardDistributor
    const distributorInitData = RewardDistributorFactory.interface.encodeFunctionData(
      "initialize",
      [await proxyController.getAddress()],
    );

    // Deploy the proxy for RewardDistributor
    const proxyDistributor = await TransparentUpgradeableProxy.deploy(
      await distributorImpl.getAddress(),
      deployer.address,
      distributorInitData,
    );
    await proxyDistributor.waitForDeployment();

    // Connect to the proxy as RewardDistributor
    const distributor = RewardDistributorFactory.attach(
      await proxyDistributor.getAddress(),
    ) as RewardDistributor;

    console.log(
      chalk.blue(
        "RewardDistController implementation deployed to:",
        chalk.green(await controllerImpl.getAddress()),
      ),
    );
    console.log(
      chalk.blue(
        "RewardDistController proxy deployed to:",
        chalk.green(await controller.getAddress()),
      ),
    );
    console.log(
      chalk.blue(
        "RewardDistributor implementation deployed to:",
        chalk.green(await distributorImpl.getAddress()),
      ),
    );
    console.log(
      chalk.blue(
        "RewardDistributor proxy deployed to:",
        chalk.green(await distributor.getAddress()),
      ),
    );

    // Set fee and fee recipient
    if (fee > 0) {
      await controller.setRewardFee(ethers.parseUnits(fee.toString(), 18));
      console.log(`Set fee: ${fee}%`);
    }
    await controller.setFeeRecipient(feerecipient);
    console.log(`Set fee recipient: ${feerecipient}`);

    // Verify contracts
    if (network.name === "baseSepolia" || network.name === "base") {
      console.log(chalk.yellow("Verifying contracts..."));

      // Verify implementations
      await run("verify:verify", { address: await controllerImpl.getAddress() });
      await run("verify:verify", { address: await distributorImpl.getAddress() });

      // Verify proxies
      await run("verify:verify", {
        address: await proxyController.getAddress(),
        constructorArguments: [
          await controllerImpl.getAddress(),
          deployer.address,
          controllerInitData,
        ],
        contract:
          "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
      });

      await run("verify:verify", {
        address: await proxyDistributor.getAddress(),
        constructorArguments: [
          await distributorImpl.getAddress(),
          deployer.address,
          distributorInitData,
        ],
        contract:
          "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
      });

      console.log(chalk.green("Contracts verified successfully."));
    }

    console.log(chalk.blue("Deployment and verification completed"));

    return {
      rewardDistControllerImpl: await controllerImpl.getAddress(),
      rewardDistController: await proxyController.getAddress(),
      rewardDistributorImpl: await distributorImpl.getAddress(),
      rewardDistributor: await proxyDistributor.getAddress(),
    };
  });

// You can run this task using: yarn hardhat deploy-reward-distributor --network baseSepolia --fee 0.2
