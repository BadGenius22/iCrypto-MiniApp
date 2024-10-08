import { Abi } from "viem";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const contractAddress = "0x50F23827A5d1082a227C0f6C4813890Ee3553BEf";

export const claimRewardsABI: Abi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256[]",
            name: "seasonId",
            type: "uint256[]",
          },
          {
            internalType: "address[]",
            name: "token",
            type: "address[]",
          },
          {
            internalType: "uint256[]",
            name: "points",
            type: "uint256[]",
          },
          {
            internalType: "bytes32[][]",
            name: "merkleProof",
            type: "bytes32[][]",
          },
        ],
        internalType: "struct RewardDistributor.ClaimData[]",
        name: "claimData",
        type: "tuple[]",
      },
    ],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // You can add other functions from the RewardDistributor contract here if needed
] as const;
