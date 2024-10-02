import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'solidity-coverage';
import 'hardhat-abi-exporter';
import 'hardhat-contract-sizer';
import '@openzeppelin/hardhat-upgrades';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-chai-matchers';
import 'hardhat-tracer';
import dotenv from 'dotenv';
/* import * as tdly from '@tenderly/hardhat-tenderly'; */

dotenv.config();

/* tdly.setup({ automaticVerifications: false }); */

// Ensure that the environment variables are defined
const {
  MNEMONIC,
  DEPLOY_ACCOUNT_KEY,
  ALCHEMY_KEY,
  ETHERSCAN_API_KEY,
  ARBISCAN_API_KEY,
  OPTIMISM_ETHERSCAN_API_KEY,
  BASESCAN_API_KEY,
  TENDERLY_FORK_ID,
} = process.env;

export const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          evmVersion: 'cancun',
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    arbitrum: {
      accounts: MNEMONIC ? { mnemonic: MNEMONIC } : [DEPLOY_ACCOUNT_KEY!].filter(Boolean),
      url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    },
    optimism: {
      accounts: MNEMONIC ? { mnemonic: MNEMONIC } : [DEPLOY_ACCOUNT_KEY!].filter(Boolean),
      url: ` https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    },
    mainnet: {
      accounts: MNEMONIC ? { mnemonic: MNEMONIC } : [DEPLOY_ACCOUNT_KEY!].filter(Boolean),
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    },
    goerli: {
      accounts: MNEMONIC ? { mnemonic: MNEMONIC } : [DEPLOY_ACCOUNT_KEY!].filter(Boolean),
      url: `https://arb-goerli.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    },
    base: {
      accounts: MNEMONIC ? { mnemonic: MNEMONIC } : [DEPLOY_ACCOUNT_KEY!].filter(Boolean),
      url: `https://mainnet.base.org`,
    },
    baseSepolia: {
      accounts: MNEMONIC ? { mnemonic: MNEMONIC } : [DEPLOY_ACCOUNT_KEY!].filter(Boolean),
      url: `https://sepolia.base.org`,
    },
    tenderly: {
      url: `https://rpc.tenderly.co/fork/${TENDERLY_FORK_ID}`,
      accounts: ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'],
    },
    hardhat: {
      initialBaseFeePerGas: 0,
    },
    local: {
      accounts: [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      ],
      url: `http://127.0.0.1:8545`,
    },
  },
  abiExporter: {
    path: './abis',
    runOnCompile: true,
    clear: true,
    flat: false,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
  etherscan: {
    apiKey: {
      arbitrumOne: ARBISCAN_API_KEY || '', // Ensure non-null value
      optimisticEthereum: OPTIMISM_ETHERSCAN_API_KEY || '', // Ensure non-null value
      mainnet: ETHERSCAN_API_KEY || '', // Ensure non-null value
      base: BASESCAN_API_KEY || '', // Added Base mainnet
      baseSepolia: BASESCAN_API_KEY || '', // Added Base Sepolia
    },
  },
  mocha: {
    timeout: 100000000,
  },
  // Uncomment and configure if needed
  // tenderly: {
  //   project: process.env.TENDERLY_PROJECT!,
  //   username: process.env.TENDERLY_USERNAME!,
  // },
};

export default config;
