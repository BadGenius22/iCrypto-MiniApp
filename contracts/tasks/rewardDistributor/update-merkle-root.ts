import { task } from "hardhat/config";
import chalk from "chalk";
import { RewardDistController__factory } from "../../typechain-types";
import fs from "fs";
import path from "path";

task("update-merkle-root", "Update the Merkle root in the Controller contract")
  .addParam("seasonId", "The season ID for which to update the Merkle root")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const [deployer] = await ethers.getSigners();

      console.log(
        chalk.blue("Updating Merkle root with the account:", chalk.green(deployer.address)),
      );

      const controllerAddress = "0x6f01CbaFe6A920EB60A1BD3c7E81F51ec6216bD8"; // Replace with your actual Controller address
      const controller = RewardDistController__factory.connect(controllerAddress, deployer);

      // Read the Merkle tree data from the JSON file
      const merkleTreeDataPath = path.resolve(
        __dirname,
        "../../../src/data/merkle-tree-data.production.json",
      );
      const merkleTreeData = JSON.parse(fs.readFileSync(merkleTreeDataPath, "utf-8"));

      const seasonId = parseInt(taskArgs.seasonId, 10);
      const merkleRoot = merkleTreeData.root;

      if (!merkleRoot) {
        throw new Error("Merkle root not found in the JSON file");
      }

      console.log(chalk.yellow(`Updating Merkle root for season ${seasonId}...`));
      console.log(chalk.yellow(`New Merkle root: ${merkleRoot}`));

      const tx = await controller.updateMerkleRoot(seasonId, merkleRoot);
      await tx.wait();

      console.log(chalk.green("Merkle root updated successfully!"));

      // Verify the update
      const storedMerkleRoot = await controller.getMerkleRoot(seasonId);
      console.log(chalk.blue(`Stored Merkle root for season ${seasonId}: ${storedMerkleRoot}`));

      if (storedMerkleRoot === merkleRoot) {
        console.log(chalk.green("Merkle root verification successful!"));
      } else {
        console.log(
          chalk.red(
            "Merkle root verification failed. Stored root does not match the provided root.",
          ),
        );
      }
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

// Usage: yarn hardhat update-merkle-root --season-id 1 --network baseSepolia
