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
import { getTokenAddress } from "../config/tokenConfig";
import { TokenReward } from "../lib/userProgress";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import merkleTreeData from "../data/merkle-tree-data.json";

interface MerkleProofData {
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
}

const fetchMerkleProof = async (address: string): Promise<MerkleProofData> => {
  const proofData = (merkleTreeData.userProofs as Record<string, any>)[address];
  if (proofData) {
    return {
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
}: TransactionWrapperProps) {
  const [merkleProofData, setMerkleProofData] = useState<MerkleProofData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const claimData = merkleProofData
    ? {
        tokens: merkleProofData.tokens,
        points: merkleProofData.points,
        merkleProofs: merkleProofData.proofs,
      }
    : null;

  const contracts = claimData
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (hasClaimedRewards) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-green-100 border-l-4 border-green-500 text-green-700 p-6 rounded-lg shadow-lg"
        role="alert"
      >
        <h3 className="font-bold text-xl mb-2">🎉 Rewards Claimed!</h3>
        <p className="mb-4">Congratulations! You have successfully claimed your rewards.</p>
        {transactionHash ? (
          <p className="mt-2">
            <a
              href={`https://sepolia.basescan.org/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300"
            >
              View Transaction on Base Sepolia Explorer
            </a>
          </p>
        ) : (
          <p className="mt-2 text-yellow-600">
            Transaction details are being processed. Please check your wallet for confirmation.
          </p>
        )}
      </motion.div>
    );
  }

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
        <Transaction
          contracts={contracts}
          chainId={BASE_SEPOLIA_CHAIN_ID}
          onError={onClaimError}
          onSuccess={handleSuccess}
        >
          <TransactionButton
            className="px-8 py-4 rounded-full font-bold text-xl transition duration-300 bg-purple-600 hover:bg-purple-700 text-white transform hover:scale-105 shadow-lg"
            text="🎉 Claim $ICR Tokens Now! 🎉"
            disabled={isClaimInitiated}
          />
          {isClaimInitiated && (
            <TransactionStatus>
              <div className="mt-4 text-center font-semibold">Claiming your rewards...</div>
            </TransactionStatus>
          )}
        </Transaction>
      </div>
    </motion.div>
  );
}
