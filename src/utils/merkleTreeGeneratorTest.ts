import { MerkleTree } from "merkletreejs";
import { Address, encodePacked, keccak256 } from "viem";
import fs from "fs";
import path from "path";

interface UserReward {
  address: string;
  seasonId: number;
  points: number;
}

interface MerkleTreeData {
  root: string;
  leaves: string[];
  userProofs: {
    [address: string]: {
      seasonId: number;
      tokens: string[];
      points: number[];
      proofs: string[][];
    };
  };
}

const TOKEN_ADDRESS = "0x5e6CB7E728E1C320855587E1D9C6F7972ebdD6D5";

// Hardcoded user data for testing
const testUsers: UserReward[] = [
  {
    address: "0x071c052a78cF8dBdD4F61381596ec64078d1840B",
    seasonId: 1,
    points: 25,
  },
  {
    address: "0xE755f77162bF252AE289482EDA6f48f4C0190306",
    seasonId: 1,
    points: 15,
  },
];

function generateLeaf(user: UserReward): Buffer {
  const packedData = encodePacked(
    ["address", "uint256", "address", "uint256"],
    [user.address as Address, BigInt(user.seasonId), TOKEN_ADDRESS as Address, BigInt(user.points)],
  );
  return Buffer.from(keccak256(packedData).slice(2), "hex");
}

function generateMerkleTree(seasonId: number) {
  console.log(`Generating Merkle tree for season ${seasonId}...`);

  const leaves = testUsers.map(user => {
    const leaf = generateLeaf(user);
    console.log(
      `Generated leaf for user ${user.address}, season ${user.seasonId}, points ${user.points}: 0x${leaf.toString("hex")}`,
    );
    return leaf;
  });

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const rootHash = merkleTree.getHexRoot();

  console.log(`Generated Merkle root: ${rootHash}`);

  const merkleTreeData: MerkleTreeData = {
    root: rootHash,
    leaves: leaves.map(leaf => "0x" + leaf.toString("hex")),
    userProofs: {},
  };

  testUsers.forEach(user => {
    const leaf = generateLeaf(user);
    const proof = merkleTree.getHexProof(leaf);

    console.log(
      `Storing proof for user ${user.address}, season ${user.seasonId}, points ${user.points}`,
    );
    console.log(`Proof: ${JSON.stringify(proof)}`);

    merkleTreeData.userProofs[user.address] = {
      seasonId: user.seasonId,
      tokens: [TOKEN_ADDRESS],
      points: [user.points],
      proofs: [proof],
    };
  });

  const fileName = `merkle-tree-data-season-${seasonId}-test.json`;
  const jsonFilePath = path.resolve(process.cwd(), "src", "data", fileName);

  fs.writeFileSync(jsonFilePath, JSON.stringify(merkleTreeData, null, 2));
  console.log(`Test Merkle tree data saved to ${jsonFilePath}`);

  return rootHash;
}

export { generateMerkleTree };
