import React from "react";
import { motion } from "framer-motion";

const HeroSection: React.FC = () => {
  const scrollToQuests = () => {
    const questSection = document.getElementById("quest-section");
    if (questSection) {
      questSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col md:flex-row items-center justify-between py-12 px-4 sm:px-6 lg:px-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white overflow-hidden"
    >
      <div className="md:w-1/2 text-center md:text-left mb-8 md:mb-0">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Selamat Datang di iCrypto Academy!
        </h1>
        <p className="text-xl sm:text-2xl mb-8">
          Belajar, Upgrade Skill, Dapatkan Rewards!
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-yellow-400 text-purple-900 font-bold py-3 px-6 rounded-full text-lg shadow-lg hover:bg-yellow-300 transition duration-300"
          onClick={scrollToQuests}
        >
          Mulai Quest!
        </motion.button>
      </div>
      <div className="md:w-1/2 flex justify-center items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="relative"
        >
          {/* Computer */}
          <motion.svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <rect x="40" y="40" width="120" height="80" fill="#333" rx="5" />
            <rect x="45" y="45" width="110" height="70" fill="#4169E1" rx="3" />
            <rect x="70" y="120" width="60" height="10" fill="#333" />
            <rect x="60" y="130" width="80" height="5" fill="#333" />
          </motion.svg>

          {/* Rewards */}
          <motion.svg
            width="60"
            height="60"
            viewBox="0 0 60 60"
            className="absolute top-0 right-0"
            animate={{
              y: [0, -20, 0],
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <circle cx="30" cy="30" r="25" fill="#FFD700" />
            <text
              x="30"
              y="38"
              fontSize="24"
              fontWeight="bold"
              fill="#333"
              textAnchor="middle"
            >
              $
            </text>
          </motion.svg>

          <motion.svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            className="absolute bottom-0 left-0"
            animate={{
              y: [0, 15, 0],
              rotate: -360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <polygon
              points="20,0 25,15 40,15 30,25 35,40 20,30 5,40 10,25 0,15 15,15"
              fill="#FFD700"
            />
          </motion.svg>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HeroSection;
