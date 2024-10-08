"use client";
import React, { useState, useEffect } from "react";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
} from "@coinbase/onchainkit/transaction";
import type { TransactionError, TransactionResponse } from "@coinbase/onchainkit/transaction";
import type { Address, ContractFunctionParameters } from "viem";
import { BASE_SEPOLIA_CHAIN_ID, claimRewardsABI, contractAddress } from "../constants";
import { TokenReward } from "../lib/userProgress";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import merkleTreeData from "../data/merkle-tree-data.production.json";

// Update this interface to match the contract's ClaimData struct
interface ClaimData {
  seasonId: number[];
  token: string[];
  points: number[];
  merkleProof: string[][];
}

interface MerkleProofData {
  seasonId: number;
  tokens: string[];
  points: number[];
  proofs: string[][];
}

interface TransactionWrapperProps {
  address: Address;
  tokenRewards: TokenReward[];
  points: number;
  hasClaimedRewards: boolean;
  isClaimInitiated: boolean;
  transactionHash: string | null;
  onClaimSuccess: (data: any) => Promise<void>;
  onClaimError: (error: any) => void;
  firestoreClaimStatus: boolean; // Add this new prop
}

const fetchMerkleProof = async (address: string): Promise<MerkleProofData> => {
  const proofData = (merkleTreeData.userProofs as Record<string, any>)[address];
  if (proofData) {
    return {
      seasonId: proofData.seasonId,
      tokens: proofData.tokens,
      points: proofData.points,
      proofs: proofData.proofs,
    };
  }
  throw new Error("Merkle proof not found for user");
};

export default function TransactionWrapper({
  address,
  tokenRewards,
  points,
  hasClaimedRewards,
  isClaimInitiated,
  transactionHash,
  onClaimSuccess,
  onClaimError,
  firestoreClaimStatus, // Add this new prop
}: TransactionWrapperProps) {
  const [merkleProofData, setMerkleProofData] = useState<MerkleProofData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const loadMerkleProofs = async () => {
      try {
        const proofData = await fetchMerkleProof(address);
        setMerkleProofData(proofData);
      } catch (error) {
        console.error("Error fetching Merkle proofs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMerkleProofs();
  }, [address]);

  const claimData: ClaimData[] = merkleProofData
    ? [
        {
          seasonId: [merkleProofData.seasonId],
          token: merkleProofData.tokens,
          points: merkleProofData.points,
          merkleProof: merkleProofData.proofs,
        },
      ]
    : [];

  const contracts =
    claimData.length > 0
      ? ([
          {
            address: contractAddress,
            abi: claimRewardsABI,
            functionName: "claimRewards",
            args: [claimData],
          },
        ] as unknown as ContractFunctionParameters[])
      : [];

  const handleSuccess = async (response: TransactionResponse) => {
    console.log("Transaction successful", response);
    await onClaimSuccess(response);

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

  const isClaimDisabled = hasClaimedRewards || firestoreClaimStatus;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isClaimDisabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-100 border-l-4 border-gray-500 text-gray-700 p-6 rounded-lg shadow-lg"
        role="alert"
      >
        <h3 className="font-bold text-xl mb-2">Rewards Already Claimed</h3>
        <p className="mb-4">You have already claimed your rewards for this season.</p>
        {transactionHash && (
          <p className="mt-2">
            <a
              href={`https://sepolia.basescan.org/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-300"
            >
              View Transaction on Base Sepolia Explorer
            </a>
          </p>
        )}
      </motion.div>
    );
  }

  const handleClaimClick = () => {
    setShowWarning(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-yellow-400 to-orange-500 p-8 rounded-lg shadow-lg text-white relative overflow-hidden"
    >
      <div className="relative z-10 text-center">
        <h3 className="font-bold text-3xl mb-4">🏆 Claim Your Rewards 🏆</h3>
        <motion.p
          className="text-2xl mb-6"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          You've earned <span className="font-bold text-purple-900">{points} $ICR tokens</span>!
        </motion.p>

        {showWarning ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            <p className="font-bold">Warning:</p>
            <p>Please ensure you have completed all quests before claiming rewards.</p>
            <p>You can only claim rewards once when the season ends.</p>
            <p>Are you sure you want to proceed?</p>
            <div className="mt-4">
              <button
                onClick={() => setShowWarning(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Cancel
              </button>
              <Transaction
                contracts={contracts}
                chainId={BASE_SEPOLIA_CHAIN_ID}
                onError={onClaimError}
                onSuccess={handleSuccess}
              >
                <TransactionButton
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                  text="Proceed with Claim"
                />
              </Transaction>
            </div>
          </div>
        ) : (
          <button
            onClick={handleClaimClick}
            className={`px-8 py-4 rounded-full font-bold text-xl transition duration-300 ${
              isClaimDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 transform hover:scale-105"
            } text-white shadow-lg`}
            disabled={isClaimInitiated || isClaimDisabled}
          >
            {isClaimDisabled ? "Rewards Already Claimed" : "🎉 Claim $ICR Tokens Now! 🎉"}
          </button>
        )}

        {isClaimInitiated && !hasClaimedRewards && (
          <TransactionStatus>
            <div className="mt-4 text-center font-semibold">Claiming your rewards...</div>
          </TransactionStatus>
        )}
      </div>
    </motion.div>
  );
}
