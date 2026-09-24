import "@nomicfoundation/hardhat-viem";
import type { HardhatUserConfig } from "hardhat/config";

// Deployment secrets come from the local shell environment only. Never commit them,
// never prefix them with VITE_/NEXT_PUBLIC_, and never paste them into the app.
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL ?? "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://invalid.local",
      chainId: 11155111,
      accounts: /^0x[0-9a-fA-F]{64}$/.test(DEPLOYER_PRIVATE_KEY) ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};

export default config;
