import { Abi } from "viem";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const contractAddress = "0xA3e40bBe8E8579Cd2619Ef9C6fEA362b760dac9f";

export const claimRewardsABI: Abi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "address[]",
            name: "tokens",
            type: "address[]",
          },
          {
            internalType: "uint256[]",
            name: "points",
            type: "uint256[]",
          },
          {
            internalType: "bytes32[][]",
            name: "merkleProofs",
            type: "bytes32[][]",
          },
        ],
        internalType: "struct RewardDistributor.ClaimData",
        name: "claimData",
        type: "tuple",
      },
    ],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // You can add other functions from the RewardDistributor contract here if needed
] as const;
