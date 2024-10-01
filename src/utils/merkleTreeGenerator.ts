import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { ethers } from "ethers";
import { Firestore } from "firebase-admin/firestore";
import { TokenReward } from "../lib/userProgress";
import fs from "fs";
import path from "path";

interface UserReward {
  address: string;
  tokenId: number;
  totalPoints: number;
}

interface MerkleTreeData {
  root: string;
  leaves: string[];
  userProofs: { [address: string]: string[] };
}

async function generateMerkleTree(db: Firestore) {
  console.log("Fetching user data from Firestore...");
  const usersRef = db.collection("users");
  const userSnapshot = await usersRef.get();

  if (userSnapshot.empty) {
    console.log("No users found in Firestore.");
    return "0x";
  }

  console.log(`Found ${userSnapshot.size} users.`);

  const userRewards: UserReward[] = userSnapshot.docs
    .map((doc) => {
      const userData = doc.data();
      console.log(`Processing user: ${doc.id}`);
      console.log(`User data:`, JSON.stringify(userData, null, 2));

      if (!userData.tokenRewards || !Array.isArray(userData.tokenRewards)) {
        console.warn(`User ${doc.id} has invalid tokenRewards data.`);
        return null;
      }

      const totalPoints = userData.tokenRewards.reduce(
        (sum, reward) => sum + reward.points,
        0
      );
      return {
        address: doc.id,
        tokenId: 1, // Assuming all rewards are for the same token ID
        totalPoints: totalPoints,
      };
    })
    .filter((reward): reward is UserReward => reward !== null);

  const leaves: Buffer[] = userRewards.map((reward) => {
    console.log(`Processing user reward:`, JSON.stringify(reward, null, 2));
    const leaf = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256"],
      [reward.address, reward.tokenId, reward.totalPoints]
    );
    console.log(`Generated leaf: ${leaf}`);
    return Buffer.from(leaf.slice(2), "hex");
  });

  if (leaves.length === 0) {
    console.warn("No valid leaves generated from user data.");
    return "0x";
  }

  console.log(`Generated ${leaves.length} leaves.`);

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const rootHash = merkleTree.getHexRoot();

  console.log(`Generated Merkle root: ${rootHash}`);

  console.log("Generating and storing Merkle proofs...");
  const merkleTreeData: MerkleTreeData = {
    root: rootHash,
    leaves: leaves.map((leaf) => "0x" + leaf.toString("hex")),
    userProofs: {},
  };

  for (const userReward of userRewards) {
    const leaf = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256"],
      [userReward.address, userReward.tokenId, userReward.totalPoints]
    );
    const proof = merkleTree.getHexProof(Buffer.from(leaf.slice(2), "hex"));

    console.log(`Storing proof for user ${userReward.address}`);
    merkleTreeData.userProofs[userReward.address] = proof;

    // Store proof in Firestore
    await db.doc(`merkleProofs/${userReward.address}`).set({
      proof,
      tokenId: userReward.tokenId,
      totalPoints: userReward.totalPoints,
    });
  }

  // Save Merkle tree data to JSON file in data/ folder
  const jsonFilePath = path.resolve(
    process.cwd(),
    "data",
    "merkle-tree-data.json"
  );

  // Ensure the data directory exists
  const dataDir = path.dirname(jsonFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(jsonFilePath, JSON.stringify(merkleTreeData, null, 2));
  console.log(`Merkle tree data saved to ${jsonFilePath}`);

  // Store Merkle root in Firestore
  await db.doc("merkleRoot/current").set({ root: rootHash });
  console.log("Merkle root stored in Firestore");

  return rootHash;
}

export { generateMerkleTree };
