import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
  address: string;
  level: number;
  tokens: number;
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlightedRank, setHighlightedRank] = useState<number | null>(null);

  useEffect(() => {
    // Simulate fetching leaderboard data
    const mockLeaderboard: LeaderboardEntry[] = [
      { address: "0x1234...5678", level: 5, tokens: 250 },
      { address: "0xabcd...efgh", level: 4, tokens: 200 },
      { address: "0x9876...5432", level: 3, tokens: 150 },
      { address: "0xijkl...mnop", level: 2, tokens: 100 },
      { address: "0xqrst...uvwx", level: 1, tokens: 50 },
    ];
    setLeaderboard(mockLeaderboard);
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
      className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 rounded-lg shadow-lg text-white"
    >
      <h2 className="text-2xl font-bold mb-4 text-center">🏆 Leaderboard 🏆</h2>
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-700">
              <th className="py-2 px-3 text-left">Rank</th>
              <th className="py-2 px-3 text-left">Address</th>
              <th className="py-2 px-3 text-center">Level</th>
              <th className="py-2 px-3 text-right">$ICR</th>
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
                  <td className="py-2 px-3">
                    <span className="mr-2">{getEmojiForRank(index + 1)}</span>
                    {index + 1}
                  </td>
                  <td className="py-2 px-3">{entry.address}</td>
                  <td className="py-2 px-3 text-center">
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {entry.level}
                    </motion.span>
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {entry.tokens}
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
