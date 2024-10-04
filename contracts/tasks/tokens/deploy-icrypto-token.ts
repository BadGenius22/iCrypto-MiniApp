import { task } from "hardhat/config";
import chalk from "chalk";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { ICryptoToken, ICryptoToken__factory } from "../../typechain-types";

task("deploy-icrypto-token", "Deploy and verify ICryptoToken").setAction(
  async (_, { ethers, network, run }) => {
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
      throw new Error("No deployer account found");
    }
    await run(TASK_COMPILE);

    console.log(
      chalk.blue("Deploying ICryptoToken with the account:", chalk.green(deployer.address)),
    );

    // Deploy ICryptoToken implementation
    const ICryptoTokenFactory = (await ethers.getContractFactory(
      "ICryptoToken",
    )) as ICryptoToken__factory;
    const tokenImpl = await ICryptoTokenFactory.deploy();
    await tokenImpl.waitForDeployment();

    // Initialize data for ICryptoToken
    const tokenInitData = ICryptoTokenFactory.interface.encodeFunctionData("initialize", []);

    // Deploy the proxy for ICryptoToken
    const TransparentUpgradeableProxy = await ethers.getContractFactory(
      "TransparentUpgradeableProxy",
    );
    const proxyToken = await TransparentUpgradeableProxy.deploy(
      await tokenImpl.getAddress(),
      deployer.address,
      tokenInitData,
    );
    await proxyToken.waitForDeployment();

    // Connect to the proxy as ICryptoToken
    const icryptoToken = ICryptoTokenFactory.attach(await proxyToken.getAddress()) as ICryptoToken;

    const tokenAddress = await icryptoToken.getAddress();

    console.log(
      chalk.blue(
        "ICryptoToken implementation deployed to:",
        chalk.green(await tokenImpl.getAddress()),
      ),
    );
    console.log(chalk.blue("ICryptoToken proxy deployed to:", chalk.green(tokenAddress)));

    // Verify contract
    if (network.name === "baseSepolia" || network.name === "base") {
      console.log(chalk.yellow("Verifying contracts..."));

      // Verify implementation
      await run("verify:verify", {
        address: await tokenImpl.getAddress(),
        contract: "src/tokens/ICryptoToken.sol:ICryptoToken",
      });

      // Verify proxy
      await run("verify:verify", {
        address: await proxyToken.getAddress(),
        constructorArguments: [await tokenImpl.getAddress(), deployer.address, tokenInitData],
        contract:
          "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
      });

      console.log(chalk.green("Contracts verified successfully."));
    }

    console.log(chalk.blue("Deployment and verification completed"));

    return {
      icryptoTokenImpl: await tokenImpl.getAddress(),
      icryptoToken: tokenAddress,
    };
  },
);

// You can run this task using: npx hardhat deploy-icrypto-token --network baseSepolia
