import hre from "hardhat";
import { getAddress, isAddress } from "viem";

import deployment from "../../src/lib/web3/deployment.json";

/** Usage: ISSUER_ADDRESS=0x... npm run authorize:sepolia  (must be run by the contract owner) */
async function main() {
  const issuer = process.env.ISSUER_ADDRESS ?? "";
  if (!isAddress(issuer)) throw new Error("Set ISSUER_ADDRESS to a valid wallet address.");
  if (!deployment.address) throw new Error("No deployment found. Run deploy first.");
  const registry = await hre.viem.getContractAt("CredentialRegistry", deployment.address as `0x${string}`);
  if (await registry.read.isAuthorizedIssuer([getAddress(issuer)])) {
    console.log("Already authorized.");
    return;
  }
  const hash = await registry.write.authorizeIssuer([getAddress(issuer)]);
  const publicClient = await hre.viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Authorized ${issuer} in block ${receipt.blockNumber} — tx ${hash}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
