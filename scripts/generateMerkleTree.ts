import { generateMerkleTree } from "../src/utils/merkleTreeGenerator";

async function main() {
  try {
    const rootHash = await generateMerkleTree();
    console.log("Merkle tree generated successfully");
    console.log("Root hash:", rootHash);
  } catch (error) {
    console.error("Error generating Merkle tree:", error);
  }
}

main();
