import { task } from "hardhat/config";
import chalk from "chalk";
import { RewardDistController__factory } from "../../typechain-types";

task("whitelist-token", "Add a token to the whitelist in RewardDistController")
  .addParam("token", "The address of the token to whitelist")
  .addParam("minAmount", "The minimum amount required for this token")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const [deployer] = await ethers.getSigners();

      console.log(
        chalk.blue("Whitelisting token with the account:", chalk.green(deployer.address)),
      );

      const controllerAddress = "0x6f01CbaFe6A920EB60A1BD3c7E81F51ec6216bD8";
      const controller = RewardDistController__factory.connect(controllerAddress, deployer);

      const tokenAddress = taskArgs.token;
      const minAmount = ethers.parseUnits(taskArgs.minAmount, 18); // Assuming 18 decimals, adjust if needed

      console.log(
        chalk.yellow(
          `Whitelisting token ${tokenAddress} with minimum amount ${taskArgs.minAmount}...`,
        ),
      );

      const tx = await controller.addToWhitelist([tokenAddress], [minAmount]);
      await tx.wait();

      console.log(chalk.green("Token successfully whitelisted!"));

      // Verify the token is now whitelisted
      const isWhitelisted = await controller.isTokenWhitelisted(tokenAddress);
      const storedMinAmount = await controller.getMinAmountForToken(tokenAddress);

      console.log(chalk.blue("Whitelist status:"));
      console.log(chalk.blue(`Token ${tokenAddress} is whitelisted: ${isWhitelisted}`));
      console.log(chalk.blue(`Minimum amount: ${ethers.formatUnits(storedMinAmount, 18)}`));
    } catch (error: unknown) {
      console.error(chalk.red("An error occurred:"));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
        if ("reason" in error) {
          console.error(chalk.red("Error reason:", (error as any).reason));
        }
        if ("data" in error) {
          console.error(chalk.red("Error data:", (error as any).data));
        }
      } else {
        console.error(chalk.red(String(error)));
      }
    }
  });

// Usage: yarn hardhat whitelist-token --token 0x1234... --min-amount 100 --network baseSepolia
