import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { verifyCredentialRecord } from "./credentials.functions";
import type { Credential, VerificationOutcome, VerificationType } from "./proofmesh";

/** Runs a database record lookup and records a verification event server-side. */
export function useVerifyRecord() {
  const verify = useServerFn(verifyCredentialRecord);
  const [outcome, setOutcome] = useState<VerificationOutcome>("idle");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [message, setMessage] = useState<string | undefined>(undefined);

  async function run(credentialId: string, type: VerificationType) {
    setOutcome("loading");
    setMessage(undefined);
    try {
      const res = await verify({ data: { credentialId, type } });
      if (!res.ok) {
        setCredential(null);
        setMessage(res.message);
        setOutcome("error");
        return;
      }
      setCredential(res.data.credential);
      const map: Record<string, VerificationOutcome> = {
        record_found: "record_found",
        pending: "pending_record",
        revoked: "revoked",
        not_found: "not_found",
        error_state: "error",
      };
      if (res.data.result === "error_state") {
        setMessage("The issuer has flagged this credential record as being in an error state.");
      }
      setOutcome(map[res.data.result] ?? "error");
    } catch {
      setCredential(null);
      setMessage("The credential registry is temporarily unavailable.");
      setOutcome("error");
    }
  }

  return { outcome, setOutcome, credential, message, run };
}
