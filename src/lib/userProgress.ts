import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";

export interface UserProgress {
  address: string;
  level: number;
  points: number;
  completedQuests: string[];
  submissions: {
    [questId: string]: {
      summary: string;
      feedback: string;
    };
  };
  hasClaimedRewards: boolean; // Add this line
}

export async function saveUserProgress(progress: UserProgress): Promise<void> {
  const userRef = doc(db, "users", progress.address);
  await setDoc(userRef, progress, { merge: true });
}

export async function getUserProgress(
  address: string
): Promise<UserProgress | null> {
  const userRef = doc(db, "users", address);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProgress;
  } else {
    return null;
  }
}

export async function updateUserPoints(
  address: string,
  points: number
): Promise<void> {
  const userRef = doc(db, "users", address);
  await updateDoc(userRef, { points });
}

export async function updateCompletedQuests(
  address: string,
  completedQuests: string[]
): Promise<void> {
  const userRef = doc(db, "users", address);
  await updateDoc(userRef, { completedQuests });
}

export async function addCompletedQuest(
  address: string,
  questId: string,
  summary: string,
  feedback: string
): Promise<void> {
  const userRef = doc(db, "users", address);
  await updateDoc(userRef, {
    completedQuests: arrayUnion(questId),
    [`submissions.${questId}`]: { summary, feedback },
  });
}
