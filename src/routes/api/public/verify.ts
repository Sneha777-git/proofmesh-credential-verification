import { createFileRoute } from "@tanstack/react-router";

import { verifyCredentialRecord } from "@/lib/credentials.functions";

/**
 * Public, read-only verification API (used by the n8n verification workflow and any
 * third-party verifier). Rate-limited per client; accepts only an ID and optional hash.
 */
export const Route = createFileRoute("/api/public/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, code: "invalid_input", message: "Expected a JSON body." }, { status: 400 });
        }
        const b = (body ?? {}) as { credentialId?: unknown; documentHash?: unknown; type?: unknown };
        const type = b.type === "qr" || b.type === "document" || b.type === "public_link" ? b.type : "credential_id";
        const res = await verifyCredentialRecord({
          data: { credentialId: b.credentialId, type, ...(b.documentHash ? { documentHash: b.documentHash } : {}) },
        });
        if (!res.ok) return Response.json(res, { status: res.code === "rate_limited" ? 429 : res.code === "invalid_input" ? 400 : 503 });
        const { chain, credential, indexStale } = res.data;
        const verdict = !chain.configured
          ? "integration_not_configured"
          : !chain.available
            ? "blockchain_unavailable"
            : !chain.exists
              ? "not_found"
              : chain.revoked
                ? "revoked"
                : chain.hashMatches === false
                  ? "hash_mismatch"
                  : "verified";
        return Response.json({
          ok: true,
          verdict,
          network: "Ethereum Sepolia Testnet",
          credentialId: String(b.credentialId).toUpperCase(),
          chain,
          record: credential
            ? {
                status: credential.status,
                ipfsCid: credential.ipfsCid,
                transactionHash: credential.transactionHash,
                blockNumber: credential.blockNumber,
              }
            : null,
          indexStale,
          note: "A proof shows registration by the issuer wallet under the contract rules — not that the credential's claims are true.",
        });
      },
    },
  },
});
