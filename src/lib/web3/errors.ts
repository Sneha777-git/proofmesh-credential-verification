import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

export type Web3ErrorCode =
  | "no_wallet"
  | "rejected"
  | "wrong_network"
  | "insufficient_funds"
  | "unauthorized_issuer"
  | "duplicate"
  | "not_found"
  | "already_revoked"
  | "not_credential_issuer"
  | "invalid_input"
  | "reverted"
  | "contract_unavailable"
  | "rpc_unavailable"
  | "unknown";

export const WEB3_MESSAGES: Record<Web3ErrorCode, string> = {
  no_wallet: "No browser wallet found. Install MetaMask (or another EIP-1193 wallet) to continue.",
  rejected: "You rejected the request in your wallet. Nothing was submitted.",
  wrong_network: "Your wallet is on the wrong network. Switch to Ethereum Sepolia Testnet.",
  insufficient_funds: "This wallet doesn't have enough Sepolia test ETH to pay for gas.",
  unauthorized_issuer: "This wallet is not an authorized issuer in the ProofMesh contract.",
  duplicate: "This exact document is already registered on-chain.",
  not_found: "No credential with this ID exists on-chain.",
  already_revoked: "This credential is already revoked.",
  not_credential_issuer: "Only the wallet that issued this credential can revoke it.",
  invalid_input: "The contract rejected the input (hash or credential type).",
  reverted: "The transaction was reverted by the contract.",
  contract_unavailable: "The ProofMesh contract is not configured or not reachable on Sepolia.",
  rpc_unavailable: "The Sepolia network could not be reached. Try again shortly.",
  unknown: "Something went wrong while talking to the blockchain.",
};

const REVERT_MAP: Record<string, Web3ErrorCode> = {
  IssuerNotAuthorized: "unauthorized_issuer",
  DuplicateDocumentHash: "duplicate",
  CredentialNotFound: "not_found",
  CredentialAlreadyRevoked: "already_revoked",
  NotCredentialIssuer: "not_credential_issuer",
  InvalidDocumentHash: "invalid_input",
  InvalidCredentialType: "invalid_input",
};

/** Translate raw wallet/RPC/contract failures into a clean code. Never surface raw stacks. */
export function toWeb3Error(error: unknown): { code: Web3ErrorCode; message: string } {
  let code: Web3ErrorCode = "unknown";
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    const rejected = error.walk((e) => e instanceof UserRejectedRequestError);
    const text = `${error.shortMessage} ${error.details ?? ""}`.toLowerCase();
    if (rejected || text.includes("user rejected") || text.includes("user denied")) code = "rejected";
    else if (revert instanceof ContractFunctionRevertedError) {
      code = REVERT_MAP[revert.data?.errorName ?? ""] ?? "reverted";
    } else if (text.includes("insufficient funds")) code = "insufficient_funds";
    else if (text.includes("chain") && text.includes("mismatch")) code = "wrong_network";
    else if (text.includes("returned no data") || text.includes("0x")) code = "contract_unavailable";
    else if (text.includes("http request failed") || text.includes("fetch") || text.includes("timeout")) code = "rpc_unavailable";
  } else if (typeof error === "object" && error && "code" in error && (error as { code: unknown }).code === 4001) {
    code = "rejected";
  }
  return { code, message: WEB3_MESSAGES[code] };
}
