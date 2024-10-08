import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../config/firebase"; // Make sure this path is correct

interface LeaderboardEntry {
  address: string;
  level: number;
  points: number;
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlightedRank, setHighlightedRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, limit(50)); // Fetch more users, we'll sort client-side
        const querySnapshot = await getDocs(q);

        const leaderboardData: LeaderboardEntry[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const totalPoints = data.tokenRewards.reduce(
            (sum: number, reward: { points: number }) => sum + reward.points,
            0,
          );
          return {
            address: doc.id,
            level: Math.floor(totalPoints / 50) + 1,
            points: totalPoints,
          };
        });

        // Sort the leaderboard data by points in descending order
        leaderboardData.sort((a, b) => b.points - a.points);

        // Take only the top 10 after sorting
        setLeaderboard(leaderboardData.slice(0, 10));
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      }
    };

    fetchLeaderboard();
  }, []);

  const getEmojiForRank = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "🏅";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-purple-600 to-indigo-600 p-4 sm:p-6 rounded-lg shadow-lg text-white"
    >
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">🏆 Leaderboard 🏆</h2>
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-purple-700">
              <th className="py-2 px-2 sm:px-3 text-left w-1/6">Rank</th>
              <th className="py-2 px-2 sm:px-3 text-left w-2/5">Address</th>
              <th className="py-2 px-2 sm:px-3 text-center w-1/6">Level</th>
              <th className="py-2 px-2 sm:px-3 text-right w-1/4">$ICR</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {leaderboard.map((entry, index) => (
                <motion.tr
                  key={entry.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`border-b border-purple-500 ${
                    highlightedRank === index + 1 ? "bg-purple-500" : ""
                  }`}
                  onMouseEnter={() => setHighlightedRank(index + 1)}
                  onMouseLeave={() => setHighlightedRank(null)}
                >
                  <td className="py-2 px-2 sm:px-3 text-sm sm:text-base">
                    <span className="mr-1 sm:mr-2">{getEmojiForRank(index + 1)}</span>
                    {index + 1}
                  </td>
                  <td className="py-2 px-2 sm:px-3 text-sm sm:text-base truncate">
                    {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                  </td>
                  <td className="py-2 px-2 sm:px-3 text-center text-sm sm:text-base">
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {entry.level}
                    </motion.span>
                  </td>
                  <td className="py-2 px-2 sm:px-3 text-right text-sm sm:text-base">
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {entry.points}
                    </motion.span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default Leaderboard;
