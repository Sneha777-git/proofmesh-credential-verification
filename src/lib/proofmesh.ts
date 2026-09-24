/**
 * ProofMesh domain types.
 *
 * Phase 1 is frontend-only: nothing here is populated with real or
 * real-looking data. These shapes exist so Phase 2 (Supabase, IPFS,
 * Ethereum Sepolia, n8n) can be wired in without restructuring the UI.
 */

export type CredentialStatus = "registered" | "revoked" | "pending" | "unknown";

export type CredentialType =
  | "Academic"
  | "Internship"
  | "Course"
  | "Achievement"
  | "Project"
  | "Other";

export const CREDENTIAL_TYPES: CredentialType[] = [
  "Academic",
  "Internship",
  "Course",
  "Achievement",
  "Project",
  "Other",
];

export interface Issuer {
  /** Display name of the authorized issuing organization. */
  name: string;
  /** Public issuer wallet address. */
  wallet: string;
  verified: boolean;
}

export interface Credential {
  credentialId: string;
  credentialType: CredentialType;
  issuer: Issuer;
  issuerWallet: string;
  /** Non-sensitive recipient reference only. Never store identity documents. */
  recipientReference: string;
  documentHash: string;
  ipfsCid: string;
  blockchain: string;
  transactionHash: string;
  blockNumber: number | null;
  status: CredentialStatus;
  issuedAt: string;
  revokedAt: string | null;
}

export type VerificationOutcome =
  | "idle"
  | "loading"
  | "verified"
  | "hash_mismatch"
  | "revoked"
  | "not_found"
  | "error";

export interface VerificationResult {
  outcome: VerificationOutcome;
  credential: Credential | null;
  /** Hash registered on-chain, when known. */
  registeredHash?: string;
  /** Hash computed from the uploaded document, when a document was supplied. */
  uploadedHash?: string;
  message?: string;
  checkedAt?: string;
}

export interface WalletState {
  status: "unsupported" | "disconnected" | "connecting" | "connected";
  address: string | null;
  chainId: number | null;
}

export interface NetworkState {
  name: string;
  chainId: number;
  explorerBaseUrl: string;
  supported: boolean;
}

export const SEPOLIA: NetworkState = {
  name: "Ethereum Sepolia",
  chainId: 11155111,
  explorerBaseUrl: "https://sepolia.etherscan.io",
  supported: true,
};

export const ISSUANCE_STEPS = [
  "FILE VALIDATED",
  "HASH GENERATED",
  "IPFS STORED",
  "METADATA PREPARED",
  "WAITING FOR WALLET",
  "WAITING FOR BLOCKCHAIN",
  "CREDENTIAL REGISTERED",
] as const;

export type IssuanceStep = (typeof ISSUANCE_STEPS)[number];

/** Shortens long technical values for display without hiding that they are truncated. */
export function truncateMiddle(value: string, lead = 10, tail = 8) {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export const CREDENTIAL_ID_PATTERN = /^PM-\d{6}$/;
