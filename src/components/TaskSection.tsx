import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { quests, Quest, getSeasonIdForQuest } from "../data/quests";
import { Progress } from "./Progress";
import {
  saveUserProgress,
  getUserProgress,
  addCompletedQuest,
  UserProgress,
  TokenReward,
} from "../lib/userProgress";
import TransactionWrapper from "./TransactionWrapper";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

interface TaskSectionProps {
  initialProgress: UserProgress | null;
  address: `0x${string}`;
}

const TaskSection: React.FC<TaskSectionProps> = ({ initialProgress, address }) => {
  const [takeaways, setTakeaways] = useState("");
  const [feedback, setFeedback] = useState("");
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedQuests, setCompletedQuests] = useState<number[]>([]);
  const [currentQuestIndex, setCurrentQuestIndex] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const questsPerPage = 4;

  const [isClaimInitiated, setIsClaimInitiated] = useState(false);
  const [hasClaimedRewards, setHasClaimedRewards] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [tokenRewards, setTokenRewards] = useState<TokenReward[]>([]);
  const [firestoreClaimStatus, setFirestoreClaimStatus] = useState(false);

  useEffect(() => {
    if (address) {
      loadUserProgress();
    }
  }, [address]);

  useEffect(() => {
    async function fetchClaimStatus() {
      if (address) {
        const userDocRef = doc(db, "users", address);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setFirestoreClaimStatus(userDocSnap.data().hasClaimedRewards || false);
        }
      }
    }

    fetchClaimStatus();
  }, [address]);

  useEffect(() => {
    console.log("Firestore claim status:", firestoreClaimStatus);
  }, [firestoreClaimStatus]);

  const loadUserProgress = async () => {
    if (address) {
      const progress = await getUserProgress(address);
      if (progress) {
        const totalPoints = progress.tokenRewards.reduce((sum, reward) => sum + reward.points, 0);
        setPoints(totalPoints);
        setLevel(Math.floor(totalPoints / 50) + 1);
        setProgress((totalPoints % 50) * 2);
        setCompletedQuests(progress.completedQuests);
        setCurrentQuestIndex(getNextIncompleteQuestIndex(progress.completedQuests));
        setHasClaimedRewards(progress.hasClaimedRewards || false);
        setTokenRewards(progress.tokenRewards);
      }
    }
  };

  const getNextIncompleteQuestIndex = (completedQuestIds: number[]) => {
    return quests.findIndex(quest => !completedQuestIds.includes(quest.id));
  };

  const handleSocialFollow = (quest: Quest) => {
    if (quest.socialChannel) {
      window.open(quest.socialChannel.url, "_blank");
      completeQuest(quest);
    }
  };

  const handleSubmit = (e: React.FormEvent, quest: Quest) => {
    e.preventDefault();
    if (!isQuestCompleted(quest.id) && isFormValid()) {
      completeQuest(quest);
      setTakeaways("");
      setFeedback("");
    } else if (isQuestCompleted(quest.id)) {
      alert("Anda sudah menyelesaikan quest ini!");
    } else {
      alert("Harap isi kedua bidang dengan minimal 5 kata.");
    }
  };

  const completeQuest = async (quest: Quest) => {
    if (!address) return;

    const seasonId = getSeasonIdForQuest(quest.id);
    if (seasonId === undefined) {
      console.error(`No season found for quest ${quest.id}`);
      return;
    }

    const newTokenReward: TokenReward = {
      points: quest.tokenRewards[0].points,
      seasonId: seasonId,
      tokenId: quest.tokenRewards[0].tokenId,
    };
    const newTokenRewards = [...tokenRewards, newTokenReward];
    const newTotalPoints = newTokenRewards.reduce((sum, reward) => sum + reward.points, 0);
    const newCompletedQuests = [...completedQuests, quest.id];
    const newLevel = Math.floor(newTotalPoints / 50) + 1;

    setPoints(newTotalPoints);
    setCompletedQuests(newCompletedQuests);
    setLevel(newLevel);
    setTokenRewards(newTokenRewards);

    // Save progress to Firebase
    const updatedProgress: UserProgress = {
      address,
      level: newLevel,
      completedQuests: newCompletedQuests,
      tokenRewards: newTokenRewards,
      submissions: {
        ...initialProgress?.submissions,
        [quest.id]: {
          seasonId: seasonId,
          summary: takeaways,
          feedback,
        },
      },
      hasClaimedRewards: false,
    };

    await saveUserProgress(updatedProgress);

    if (quest.requiresFeedback) {
      await addCompletedQuest(address, quest.id, seasonId, takeaways, feedback);
    }

    setProgress((newTotalPoints % 50) * 2);
    if (newLevel > level) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setShowReward(true);
    setTimeout(() => {
      setShowReward(false);
      setCurrentQuestIndex(getNextIncompleteQuestIndex(newCompletedQuests));
    }, 3000);
  };

  const isFormValid = () => {
    const takeawaysWordCount = takeaways.trim().split(/\s+/).length;
    const feedbackWordCount = feedback.trim().split(/\s+/).length;
    return takeawaysWordCount >= 5 && feedbackWordCount >= 5;
  };

  const isQuestCompleted = (questId: number) => completedQuests.includes(questId);

  const handleClaim = () => {
    if (hasClaimedRewards) {
      alert("You have already claimed your rewards!");
      return;
    }
    setIsClaimInitiated(true);
    console.log("Claiming rewards...");
  };

  const handleClaimSuccess = async (data: any) => {
    console.log("Claim success data:", data);
    if (!address) {
      console.error("No address available");
      return;
    }

    const hash = data.hash;
    console.log("Transaction hash:", hash);

    if (hash) {
      setTransactionHash(hash);

      try {
        // Update the user's progress in Firestore
        const userDocRef = doc(db, "users", address);
        await updateDoc(userDocRef, {
          hasClaimedRewards: true,
        });
        console.log("Firestore updated successfully");

        // Update local state
        setHasClaimedRewards(true);
        setFirestoreClaimStatus(true);

        // Trigger confetti effect
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#FF4500", "#8A2BE2", "#4B0082"],
        });

        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#FFD700", "#FFA500", "#FF4500", "#8A2BE2", "#4B0082"],
          });
        }, 250);

        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#FFD700", "#FFA500", "#FF4500", "#8A2BE2", "#4B0082"],
          });
        }, 400);
      } catch (error) {
        console.error("Error updating Firestore:", error);
        setClaimError("Failed to update claim status. Please contact support.");
      } finally {
        setIsClaimInitiated(false);
      }
    } else {
      console.error("No transaction hash found in the response");
      setClaimError("Failed to get transaction hash. Please try again.");
      setIsClaimInitiated(false);
    }
  };

  const handleClaimError = (error: any) => {
    console.error("Error claiming reward:", error);
    setClaimError("Failed to claim reward. Please try again.");
    setIsClaimInitiated(false);
  };

  const filterQuests = (questList: Quest[]) => {
    switch (activeTab) {
      case "prerequisite":
        return questList.filter(quest => quest.isPrerequisite);
      case "article":
        return questList.filter(quest => !quest.isPrerequisite);
      default:
        return questList;
    }
  };

  const paginateQuests = (questList: Quest[]) => {
    const startIndex = (currentPage - 1) * questsPerPage;
    return questList.slice(startIndex, startIndex + questsPerPage);
  };

  const filteredQuests = filterQuests(quests);
  const paginatedQuests = paginateQuests(filteredQuests);
  const totalPages = Math.ceil(filteredQuests.length / questsPerPage);

  const renderQuestCard = (quest: Quest) => {
    const isCompleted = isQuestCompleted(quest.id);
    const isFormValid = quest.requiresFeedback
      ? takeaways.trim().split(/\s+/).length >= 5 && feedback.trim().split(/\s+/).length >= 5
      : true;

    return (
      <motion.div
        key={quest.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`bg-white p-6 rounded-lg shadow-lg border-4 ${
          isCompleted ? "border-green-500" : "border-yellow-500"
        }`}
      >
        <h3 className="font-bold text-xl mb-4 text-gray-800">{quest.title}</h3>
        <p className="mb-4 text-gray-600">{quest.description}</p>
        {quest.type === "social" && quest.socialChannel ? (
          <button
            onClick={() => handleSocialFollow(quest)}
            className={`w-full px-6 py-3 rounded-full font-semibold transition duration-300 ${
              isCompleted
                ? "bg-green-500 text-white cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            disabled={isCompleted}
          >
            {isCompleted ? "Completed!" : `Follow on ${quest.socialChannel.name}`}
          </button>
        ) : quest.type === "article" ? (
          <>
            <a
              href={quest.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full text-center px-6 py-3 rounded-full font-semibold transition duration-300 ${
                isCompleted
                  ? "bg-green-500 text-white cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {isCompleted ? "Completed!" : "Read Article"}
            </a>
            {!isCompleted && quest.requiresFeedback && (
              <form onSubmit={e => handleSubmit(e, quest)} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor={`takeaways-${quest.id}`}
                    className="block mb-2 font-semibold text-gray-700"
                  >
                    Apa yang Kamu pelajari dari artikel ini? (min. 5 kata)
                  </label>
                  <textarea
                    id={`takeaways-${quest.id}`}
                    value={takeaways}
                    onChange={e => setTakeaways(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`feedback-${quest.id}`}
                    className="block mb-2 font-semibold text-gray-700"
                  >
                    Apa Feedback Kamu tentang artikel ini? (min. 5 kata)
                  </label>
                  <textarea
                    id={`feedback-${quest.id}`}
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  className={`w-full px-6 py-3 rounded-full font-semibold text-white transition duration-300 ${
                    isFormValid
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!isFormValid}
                >
                  Submit Quest
                </button>
              </form>
            )}
          </>
        ) : (
          // Handle custom quest types here
          <div>Custom quest content</div>
        )}
        {isCompleted && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 text-center">
            <span className="inline-block bg-yellow-400 text-purple-900 px-4 py-2 rounded-full font-bold">
              +{quest.tokenRewards.reduce((sum, reward) => sum + reward.points, 0)} $ICR
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div id="quest-section" className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-lg shadow-lg text-white relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path
              d="M0 0 L100 0 L100 100 L0 100 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
            <path
              d="M0 50 L100 50 M50 0 L50 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </svg>
        </div>
        <div className="relative z-10">
          <h2 className="font-bold text-3xl mb-4">Your iCrypto Journey</h2>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xl">Level {level}</span>
            <span className="text-xl font-semibold">{points} $ICR</span>
          </div>
          <Progress value={progress} className="mb-4" />
          <div className="flex justify-between text-sm">
            <span>0 XP</span>
            <span>Next Level: {(Math.floor(points / 50) + 1) * 50} XP</span>
          </div>
          <motion.div
            className="mt-6 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            <motion.div
              className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-purple-900 font-bold text-3xl"
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              {level}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Available Quests</h2>
        <div className="flex justify-center mb-4">
          <button
            className={`px-4 py-2 rounded-l-lg ${activeTab === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={`px-4 py-2 ${activeTab === "prerequisite" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("prerequisite")}
          >
            Prerequisites
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg ${activeTab === "article" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("article")}
          >
            Articles
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paginatedQuests.map(renderQuestCard)}
        </div>
        <div className="mt-6 flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Claim Rewards Section */}
      {points > 0 && (
        <TransactionWrapper
          address={address}
          tokenRewards={tokenRewards}
          points={points}
          hasClaimedRewards={hasClaimedRewards}
          isClaimInitiated={isClaimInitiated}
          transactionHash={transactionHash}
          onClaimSuccess={handleClaimSuccess}
          onClaimError={handleClaimError}
          firestoreClaimStatus={firestoreClaimStatus}
        />
      )}
    </div>
  );
};

export default TaskSection;
