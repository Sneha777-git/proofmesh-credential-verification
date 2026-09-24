import { getAddress, isAddress, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

import deployment from "./deployment.json";

/**
 * Single source of blockchain configuration.
 * Address/chain come from VITE_CONTRACT_ADDRESS / VITE_CHAIN_ID (the Vite equivalent of
 * NEXT_PUBLIC_*), falling back to deployment.json written by the Hardhat deploy script.
 * Both values are public by nature — no secrets live here.
 */
const env = import.meta.env as Record<string, string | undefined>;

const rawAddress = env["VITE_CONTRACT_ADDRESS"] || (deployment.address as string | null) || "";
export const CONTRACT_ADDRESS: Address | null = isAddress(rawAddress) ? getAddress(rawAddress) : null;
export const CHAIN_ID = Number(env["VITE_CHAIN_ID"] || deployment.chainId || sepolia.id);
export const DEPLOY_BLOCK = BigInt((deployment.deployBlock as number | null) ?? 0);
export const CHAIN = sepolia;
export const CHAIN_LABEL = "Ethereum Sepolia Testnet";
export const EXPLORER_URL = sepolia.blockExplorers.default.url;

/** Browser-side read RPC (public, keyless). Private RPC URLs stay server-side in SEPOLIA_RPC_URL. */
export const PUBLIC_RPC_URL = env["VITE_SEPOLIA_PUBLIC_RPC"] || "https://ethereum-sepolia-rpc.publicnode.com";

export const isContractConfigured = () => CONTRACT_ADDRESS !== null && CHAIN_ID === sepolia.id;

export const explorerTxUrl = (hash: Hex) => `${EXPLORER_URL}/tx/${hash}`;
export const explorerAddressUrl = (address: string) => `${EXPLORER_URL}/address/${address}`;

/** Deterministic mapping: on-chain uint256 ID 1 <=> "PM-000001". */
export function formatCredentialId(id: bigint | number): string {
  return `PM-${String(id).padStart(6, "0")}`;
}
export function parseCredentialId(value: string): bigint | null {
  const match = /^PM-(\d{6})$/.exec(value.trim().toUpperCase());
  if (!match) return null;
  const n = BigInt(match[1]!);
  return n === 0n ? null : n;
}

/** SHA-256 digest bytes -> Solidity bytes32. The only hashing scheme used anywhere. */
export async function sha256File(file: Blob): Promise<Hex> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return `0x${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
}
