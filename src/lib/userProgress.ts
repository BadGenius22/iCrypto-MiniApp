import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";

export interface TokenReward {
  points: number;
  seasonId: number;
  tokenId: number;
}

export interface UserProgress {
  address: string;
  level: number;
  completedQuests: number[];
  tokenRewards: TokenReward[];
  submissions: {
    [questId: number]: {
      seasonId: number;
      summary: string;
      feedback: string;
    };
  };
  hasClaimedRewards: boolean;
}

export const saveUserProgress = async (progress: UserProgress) => {
  try {
    const userRef = doc(db, "users", progress.address);
    await setDoc(userRef, progress);
  } catch (error) {
    console.error("Error saving user progress:", error);
  }
};

export const getUserProgress = async (address: string): Promise<UserProgress | null> => {
  try {
    const userRef = doc(db, "users", address);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProgress;
    }
    return null;
  } catch (error) {
    console.error("Error getting user progress:", error);
    return null;
  }
};

export async function updateUserPoints(address: string, points: number): Promise<void> {
  const userRef = doc(db, "users", address);
  await updateDoc(userRef, { points });
}

export async function updateCompletedQuests(
  address: string,
  completedQuests: string[],
): Promise<void> {
  const userRef = doc(db, "users", address);
  await updateDoc(userRef, { completedQuests });
}

export async function addCompletedQuest(
  address: string,
  questId: number, // Kept as number
  seasonId: number,
  summary: string,
  feedback: string,
): Promise<void> {
  const userRef = doc(db, "users", address);
  await updateDoc(userRef, {
    completedQuests: arrayUnion(questId),
    [`submissions.${questId}`]: { seasonId, summary, feedback },
  });
}
