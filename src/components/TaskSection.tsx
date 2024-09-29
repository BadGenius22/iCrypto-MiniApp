import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { quests, Quest } from "../data/quests";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
} from "@coinbase/onchainkit/transaction";
import { BASE_SEPOLIA_CHAIN_ID } from "../constants";
import { Progress } from "./Progress";
import {
  saveUserProgress,
  getUserProgress,
  addCompletedQuest,
  UserProgress,
} from "../lib/userProgress";
import { useOnchainKit } from "@coinbase/onchainkit";

interface TaskSectionProps {
  initialProgress: UserProgress | null;
  address: `0x${string}`; // Add this line
}

const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

const TaskSection: React.FC<TaskSectionProps> = ({
  initialProgress,
  address,
}) => {
  const [takeaways, setTakeaways] = useState("");
  const [feedback, setFeedback] = useState("");
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [currentQuestIndex, setCurrentQuestIndex] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const questsPerPage = 4;

  useEffect(() => {
    if (address) {
      loadUserProgress();
    }
  }, [address]);

  const loadUserProgress = async () => {
    if (address) {
      const progress = await getUserProgress(address);
      if (progress) {
        setPoints(progress.points);
        setLevel(Math.floor(progress.points / 50) + 1);
        setProgress((progress.points % 50) * 2);
        setCompletedQuests(progress.completedQuests);
        setCurrentQuestIndex(
          getNextIncompleteQuestIndex(progress.completedQuests)
        );
      }
    }
  };

  const getNextIncompleteQuestIndex = (completedQuestIds: string[]) => {
    return quests.findIndex((quest) => !completedQuestIds.includes(quest.id));
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
    if (!address) return; // Add this check

    const newPoints = points + quest.rewardPoints;
    const newCompletedQuests = [...completedQuests, quest.id];
    const newLevel = Math.floor(newPoints / 50) + 1;

    setPoints(newPoints);
    setCompletedQuests(newCompletedQuests);
    setLevel(newLevel);

    // Save progress to Firebase
    await saveUserProgress({
      address,
      level: newLevel,
      points: newPoints,
      completedQuests: newCompletedQuests,
      submissions: {
        ...initialProgress?.submissions,
        [quest.id]: { summary: takeaways, feedback },
      },
    });

    await addCompletedQuest(address, quest.id, takeaways, feedback);

    setProgress((newPoints % 50) * 2);
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

  const isQuestCompleted = (questId: string) =>
    completedQuests.includes(questId);

  const resetSubmission = async () => {
    if (!address) return; // Add this check

    const resetProgress: UserProgress = {
      address,
      level: 1,
      points: 0,
      completedQuests: [],
      submissions: {},
    };
    await saveUserProgress(resetProgress);
    setPoints(0);
    setLevel(1);
    setProgress(0);
    setCompletedQuests([]);
    setCurrentQuestIndex(0);
    setTakeaways("");
    setFeedback("");
  };

  const handleClaim = async () => {
    // This function will be called when the TransactionButton is clicked
    console.log("Claiming rewards...");
  };

  const handleClaimSuccess = async () => {
    if (!address) return; // Add this check

    const resetProgress: UserProgress = {
      address,
      level: 1,
      points: 0,
      completedQuests: [],
      submissions: {},
    };
    await saveUserProgress(resetProgress);
    setPoints(0);
    setCompletedQuests([]);

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
  };

  const handleClaimError = (error: any) => {
    console.error("Error claiming reward:", error);
    setClaimError("Failed to claim reward. Please try again.");
  };

  const filterQuests = (questList: Quest[]) => {
    switch (activeTab) {
      case "prerequisite":
        return questList.filter((quest) => quest.isPrerequisite);
      case "article":
        return questList.filter((quest) => !quest.isPrerequisite);
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
    const isFormValid =
      takeaways.trim().split(/\s+/).length >= 5 &&
      feedback.trim().split(/\s+/).length >= 5;

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
        {quest.isPrerequisite && quest.socialChannel ? (
          <button
            onClick={() => handleSocialFollow(quest)}
            className={`w-full px-6 py-3 rounded-full font-semibold transition duration-300 ${
              isCompleted
                ? "bg-green-500 text-white cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            disabled={isCompleted}
          >
            {isCompleted
              ? "Completed!"
              : `Follow on ${quest.socialChannel.name}`}
          </button>
        ) : (
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
            {!isCompleted && (
              <form
                onSubmit={(e) => handleSubmit(e, quest)}
                className="mt-4 space-y-4"
              >
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
                    onChange={(e) => setTakeaways(e.target.value)}
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
                    onChange={(e) => setFeedback(e.target.value)}
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
        )}
        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-4 text-center"
          >
            <span className="inline-block bg-yellow-400 text-purple-900 px-4 py-2 rounded-full font-bold">
              +{quest.rewardPoints} $ICR
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const TransactionStatusComponent: React.FC = () => {
    return (
      <TransactionStatus>
        <StatusContent />
      </TransactionStatus>
    );
  };

  const StatusContent: React.FC = () => {
    const [status, setStatus] = useState<string>("idle");

    useEffect(() => {
      // This is a placeholder for actual status updates
      // You might need to implement a way to get real-time status updates
      const timer = setTimeout(() => {
        setStatus("in-progress");
        setTimeout(() => {
          setStatus(Math.random() > 0.5 ? "success" : "error");
        }, 2000);
      }, 1000);

      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="mt-4 text-center font-semibold">
        {status === "in-progress" && "Claiming your rewards..."}
        {status === "success" && "Congratulations! Rewards claimed!"}
        {status === "error" && "Error claiming rewards. Please try again."}
        {status === "idle" && "Ready to claim rewards"}
      </div>
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
          <svg
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
          >
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
          <button
            onClick={resetSubmission}
            className="mt-6 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-600 transition duration-300"
          >
            Reset Progress (Testing)
          </button>
        </div>
      </motion.div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">
          Available Quests
        </h2>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 p-8 rounded-lg shadow-lg text-white relative overflow-hidden"
        >
          <div className="relative z-10 text-center">
            <h3 className="font-bold text-3xl mb-4">
              🏆 Claim Your Rewards 🏆
            </h3>
            <motion.p
              className="text-2xl mb-6"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              You've earned{" "}
              <span className="font-bold text-purple-900">
                {points} $ICR tokens
              </span>
              !
            </motion.p>
            <Transaction
              contracts={[
                {
                  address: CONTRACT_ADDRESS,
                  abi: [
                    {
                      name: "claimReward",
                      type: "function",
                      stateMutability: "nonpayable",
                      inputs: [],
                      outputs: [],
                    },
                  ],
                  functionName: "claimReward",
                  args: [],
                },
              ]}
              chainId={BASE_SEPOLIA_CHAIN_ID}
              onSuccess={handleClaimSuccess}
              onError={handleClaimError}
            >
              <TransactionButton
                className="px-8 py-4 rounded-full font-bold text-xl transition duration-300 bg-purple-600 hover:bg-purple-700 text-white transform hover:scale-105 shadow-lg"
                text="🎉 Claim $ICR Tokens Now! 🎉"
              />
              <TransactionStatusComponent />
            </Transaction>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TaskSection;
