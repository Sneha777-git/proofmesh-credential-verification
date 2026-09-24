import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

/**
 * Deploys CredentialRegistry to the selected network.
 * Requires SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in YOUR local shell (never committed).
 * Writes the public address + deploy block to src/lib/web3/deployment.json for the app.
 */
async function main() {
  const network = hre.network.name;
  if (network === "sepolia") {
    if (!process.env.SEPOLIA_RPC_URL) throw new Error("SEPOLIA_RPC_URL is not set.");
    if (!/^0x[0-9a-fA-F]{64}$/.test(process.env.DEPLOYER_PRIVATE_KEY ?? "")) {
      throw new Error("DEPLOYER_PRIVATE_KEY is missing or malformed. Set it in your shell, never in a file you commit.");
    }
  }
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();
  const chainId = await publicClient.getChainId();
  console.log(`Deploying from ${deployer!.account.address} on chain ${chainId}…`);

  const registry = await hre.viem.deployContract("CredentialRegistry");
  const block = await publicClient.getBlockNumber();
  console.log(`CredentialRegistry deployed at ${registry.address} (≈ block ${block})`);

  if (network === "sepolia") {
    const out = path.resolve(__dirname, "../../src/lib/web3/deployment.json");
    fs.writeFileSync(
      out,
      JSON.stringify({ address: registry.address, chainId, deployBlock: Number(block) - 5 }, null, 2) + "\n",
    );
    console.log(`Wrote ${out}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
