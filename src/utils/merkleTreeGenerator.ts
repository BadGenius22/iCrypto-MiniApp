import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { ethers } from "ethers";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getTokenAddress } from "../config/tokenConfig";
import { TokenReward } from "../lib/userProgress";

interface UserReward {
  address: string;
  tokenId: number;
  points: number;
}

async function generateMerkleTree() {
  // Fetch all user data from Firestore
  const usersRef = collection(db, "users");
  const userSnapshot = await getDocs(usersRef);

  const leaves = userSnapshot.docs.flatMap((doc) => {
    const userData = doc.data();
    return userData.tokenRewards.map((reward: TokenReward) => {
      const userReward: UserReward = {
        address: doc.id,
        tokenId: reward.tokenId,
        points: reward.points,
      };
      return ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256"],
        [userReward.address, userReward.tokenId, userReward.points]
      );
    });
  });

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const rootHash = merkleTree.getHexRoot();

  // Store Merkle proofs for each user
  for (const userDoc of userSnapshot.docs) {
    const userData = userDoc.data();
    const userProofs = userData.tokenRewards.map((reward: TokenReward) => {
      const userReward: UserReward = {
        address: userDoc.id,
        tokenId: reward.tokenId,
        points: reward.points,
      };
      const leaf = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256"],
        [userReward.address, userReward.tokenId, userReward.points]
      );
      return merkleTree.getHexProof(Buffer.from(leaf, "hex"));
    });

    // Store proofs in a new 'merkleProofs' collection
    await setDoc(doc(db, "merkleProofs", userDoc.id), { proofs: userProofs });
  }

  return rootHash;
}

export { generateMerkleTree };
