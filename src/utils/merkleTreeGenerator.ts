import { MerkleTree } from "merkletreejs";
import { Address, encodePacked, keccak256 } from "viem";
import { Firestore } from "firebase-admin/firestore";
import { getTokenAddress } from "../config/tokenConfig";
import fs from "fs";
import path from "path";

interface UserReward {
  address: string;
  tokenRewards: {
    [tokenAddress: string]: number; // Sum of points for each token address
  };
}

interface MerkleTreeData {
  root: string;
  leaves: string[];
  userProofs: {
    [address: string]: {
      tokens: string[];
      points: number[];
      proofs: string[][];
    };
  };
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
    .map(doc => {
      const userData = doc.data();
      console.log(`Processing user: ${doc.id}`);
      console.log(`User data:`, JSON.stringify(userData, null, 2));

      if (!userData.tokenRewards || !Array.isArray(userData.tokenRewards)) {
        console.warn(`User ${doc.id} has invalid tokenRewards data.`);
        return null;
      }

      const tokenRewards: { [tokenAddress: string]: number } = {};
      userData.tokenRewards.forEach(reward => {
        const tokenAddress = getTokenAddress(reward.tokenId);
        tokenRewards[tokenAddress] = (tokenRewards[tokenAddress] || 0) + reward.points;
      });

      return {
        address: doc.id,
        tokenRewards,
      };
    })
    .filter((reward): reward is UserReward => reward !== null);

  // Map to hold the original leaves (before sorting) keyed by user address
  const userLeavesMap: { [address: string]: { leaf: Buffer; token: string; points: bigint }[] } =
    {};

  // Create leaves and store them in the map by user address
  const leaves = userRewards.flatMap(reward => {
    const tokens = Object.keys(reward.tokenRewards);
    const userLeaves = tokens.map(token => {
      const points = BigInt(reward.tokenRewards[token]);

      const packedData = encodePacked(
        ["address", "address", "uint256"],
        [reward.address as Address, token as Address, points],
      );
      const leaf = keccak256(packedData);

      console.log(
        `Generated leaf for user ${reward.address}, token ${token}, points ${points}: ${leaf}`,
      );

      // Store the unsorted leaf for this user
      if (!userLeavesMap[reward.address]) {
        userLeavesMap[reward.address] = [];
      }
      userLeavesMap[reward.address].push({
        leaf: Buffer.from(leaf.slice(2), "hex"),
        token,
        points,
      });

      return { leaf: Buffer.from(leaf.slice(2), "hex"), user: reward.address, token, points };
    });
    return userLeaves;
  });

  // Sort leaves to ensure consistent ordering
  leaves.sort((a, b) => a.leaf.compare(b.leaf));

  const merkleTree = new MerkleTree(
    leaves.map(item => item.leaf),
    keccak256,
    { sortPairs: true },
  );
  const rootHash = merkleTree.getHexRoot();

  console.log(`Generated Merkle root: ${rootHash}`);

  console.log("Generating and storing Merkle proofs...");
  const merkleTreeData: MerkleTreeData = {
    root: rootHash,
    leaves: leaves.map(item => "0x" + item.leaf.toString("hex")),
    userProofs: {},
  };

  // Now, generate the proofs using the original unsorted leaves from userLeavesMap
  for (const userAddress of Object.keys(userLeavesMap)) {
    const userLeaves = userLeavesMap[userAddress];
    const userProofs: string[][] = [];
    const userTokens: string[] = [];
    const userPoints: number[] = [];

    for (const leaf of userLeaves) {
      const proof = merkleTree.getHexProof(leaf.leaf);

      console.log(
        `Storing proof for user ${userAddress}, token ${leaf.token}, points ${leaf.points}`,
      );
      userProofs.push(proof);
      userTokens.push(leaf.token);
      userPoints.push(Number(leaf.points));

      console.log(`Leaf: 0x${leaf.leaf.toString("hex")}`);
      console.log(`Proof: ${JSON.stringify(proof)}`);
    }

    merkleTreeData.userProofs[userAddress] = {
      tokens: userTokens,
      points: userPoints,
      proofs: userProofs,
    };
  }

  // Save Merkle tree data to JSON file in data/ folder
  const jsonFilePath = path.resolve(process.cwd(), "data", "merkle-tree-data.json");

  // Ensure the data directory exists
  const dataDir = path.dirname(jsonFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(jsonFilePath, JSON.stringify(merkleTreeData, null, 2));
  console.log(`Merkle tree data saved to ${jsonFilePath}`);

  return rootHash;
}

export { generateMerkleTree };
