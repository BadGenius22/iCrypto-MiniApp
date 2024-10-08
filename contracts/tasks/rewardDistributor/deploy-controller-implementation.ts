import { task } from "hardhat/config";
import chalk from "chalk";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { Controller__factory } from "../../typechain-types";

task("deploy-controller-implementation", "Deploy Controller implementation").setAction(
  async (_, { ethers, network, run }) => {
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
      throw new Error("No deployer account found");
    }

    await run(TASK_COMPILE);

    console.log(
      chalk.blue(
        "Deploying Controller implementation with the account:",
        chalk.green(deployer.address),
      ),
    );

    // Deploy Controller implementation
    const ControllerFactory = (await ethers.getContractFactory(
      "Controller",
    )) as Controller__factory;
    const controllerImpl = await ControllerFactory.deploy();
    await controllerImpl.waitForDeployment();

    console.log(
      chalk.blue(
        "Controller implementation deployed to:",
        chalk.green(await controllerImpl.getAddress()),
      ),
    );

    // Verify contract
    if (network.name === "baseSepolia" || network.name === "base") {
      console.log(chalk.yellow("Verifying contract..."));

      await run("verify:verify", {
        address: await controllerImpl.getAddress(),
        constructorArguments: [],
      });

      console.log(chalk.green("Contract verified successfully."));
    }

    console.log(chalk.blue("Deployment and verification completed"));

    return {
      controllerImpl: await controllerImpl.getAddress(),
    };
  },
);

// You can run this task using: yarn hardhat deploy-controller-implementation --network baseSepolia
