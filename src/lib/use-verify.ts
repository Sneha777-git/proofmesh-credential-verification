import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { verifyCredentialRecord } from "./credentials.functions";
import type { ChainState, Credential, VerificationOutcome, VerificationType } from "./proofmesh";

/**
 * Public verification: reads the contract on Sepolia (source of truth) server-side,
 * falls back to the database index when the chain can't be read, and records an event.
 * No wallet is required.
 */
export function useVerifyRecord() {
  const verify = useServerFn(verifyCredentialRecord);
  const [outcome, setOutcome] = useState<VerificationOutcome>("idle");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [chain, setChain] = useState<ChainState | null>(null);
  const [uploadedHash, setUploadedHash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | undefined>(undefined);

  async function run(credentialId: string, type: VerificationType, documentHash?: string) {
    setOutcome("loading");
    setMessage(undefined);
    setUploadedHash(documentHash ?? null);
    try {
      const res = await verify({
        data: documentHash ? { credentialId, type, documentHash } : { credentialId, type },
      });
      if (!res.ok) {
        setCredential(null);
        setChain(null);
        setMessage(res.message);
        setOutcome("error");
        return;
      }
      const { chain: c, credential: record, result, indexStale } = res.data;
      setCredential(record);
      setChain(c);
      if (indexStale)
        setMessage(
          "The ProofMesh database index is out of date and could not be refreshed. The result below follows the blockchain, which is authoritative.",
        );

      if (c.configured && c.available) {
        if (!c.exists) return setOutcome("not_found");
        if (c.revoked) return setOutcome("revoked");
        if (c.hashMatches === false) return setOutcome("hash_mismatch");
        return setOutcome("verified");
      }

      // Chain not readable: report the database index only, clearly labelled.
      setMessage(
        c.configured
          ? "The Sepolia network could not be reached, so only the database record is shown. This is not a blockchain verification."
          : "The ProofMesh contract is not configured yet, so only the database record is shown.",
      );
      const map: Record<string, VerificationOutcome> = {
        record_found: "record_found",
        pending: "pending_record",
        revoked: "revoked",
        not_found: "not_found",
        error_state: "error",
      };
      setOutcome(map[result] ?? "error");
    } catch {
      setCredential(null);
      setChain(null);
      setMessage("The verification service is temporarily unavailable.");
      setOutcome("error");
    }
  }

  return { outcome, setOutcome, credential, chain, uploadedHash, message, run };
}
