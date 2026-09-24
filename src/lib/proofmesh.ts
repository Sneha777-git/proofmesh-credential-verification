/**
 * ProofMesh domain types.
 *
 * Phase 2: these mirror the database record. A database record is application
 * metadata only — it is NOT a blockchain proof. The on-chain proof (Phase 3)
 * and the IPFS document are separate sources of truth.
 */

export type CredentialStatus = "ACTIVE" | "REVOKED" | "PENDING" | "ERROR";
export const CREDENTIAL_STATUSES: CredentialStatus[] = ["ACTIVE", "REVOKED", "PENDING", "ERROR"];

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

export type IssuerAuthorization = "authorized" | "unauthorized" | "pending" | "suspended";

export interface Issuer {
  walletAddress: string;
  issuerName: string;
  authorizationStatus: IssuerAuthorization;
}

/** Public credential record as stored in the database. No personal data. */
export interface Credential {
  credentialId: string;
  credentialType: CredentialType;
  issuerWallet: string;
  issuer: Issuer | null;
  documentHash: string;
  ipfsCid: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  status: CredentialStatus;
  issuedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export type VerificationType = "credential_id" | "qr" | "document" | "public_link";
export type VerificationResultCode =
  | "record_found"
  | "revoked"
  | "pending"
  | "error_state"
  | "not_found";

export type VerificationOutcome =
  | "idle"
  | "loading"
  | "verified"
  | "record_found"
  | "pending_record"
  | "hash_mismatch"
  | "revoked"
  | "not_found"
  | "error";

export interface VerificationEvent {
  id: string;
  credentialId: string;
  verificationType: VerificationType;
  result: VerificationResultCode;
  createdAt: string;
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
