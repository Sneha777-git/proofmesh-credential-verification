import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { getAddress, isAddress, verifyMessage, type Hex } from "viem";

import { pinMessage, validatePdf } from "@/lib/pdf";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const err = (status: number, code: string, message: string) => json(status, { ok: false, code, message });

/**
 * Upload a credential PDF to IPFS on behalf of an authorized issuer.
 * Caller proves wallet control with a signed message (no private key ever leaves MetaMask);
 * the contract is then asked whether that wallet is an authorized issuer.
 */
export const Route = createFileRoute("/api/public/ipfs-pin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { ipfsConfigured, pinPdfToIpfs, rateLimit, dispatchToN8n } = await import("@/lib/integrations.server");
        if (!ipfsConfigured()) return err(503, "ipfs_not_configured", "IPFS storage is not configured on this server.");
        if (!(await rateLimit("pin", 20, 3600))) return err(429, "rate_limited", "Too many uploads. Try again later.");

        const length = Number(request.headers.get("content-length") ?? 0);
        if (length > 11 * 1024 * 1024) return err(413, "oversized_pdf", "The PDF is larger than 10 MB.");

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return err(400, "invalid_input", "Malformed upload.");
        }
        const file = form.get("file");
        const wallet = String(form.get("wallet") ?? "");
        const signature = String(form.get("signature") ?? "");
        const claimedHash = String(form.get("documentHash") ?? "").toLowerCase();
        const timestamp = Number(form.get("timestamp") ?? 0);

        if (!(file instanceof File)) return err(400, "invalid_input", "No file was received.");
        if (!isAddress(wallet) || !/^0x[0-9a-fA-F]{130}$/.test(signature) || !/^0x[0-9a-f]{64}$/.test(claimedHash))
          return err(400, "invalid_input", "Some of the submitted data is invalid.");
        if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 10 * 60 * 1000)
          return err(400, "expired_signature", "The upload approval expired. Try again.");

        const bytes = new Uint8Array(await file.arrayBuffer());
        const check = validatePdf(bytes, file.name, file.type);
        if (!check.ok) return err(400, check.code, check.message);

        // Recompute the fingerprint server-side — same SHA-256 over the same raw bytes.
        const hash = `0x${createHash("sha256").update(bytes).digest("hex")}`;
        if (hash !== claimedHash) return err(400, "hash_mismatch", "The file changed after it was fingerprinted. Re-select it.");

        let signer: boolean;
        try {
          signer = await verifyMessage({
            address: getAddress(wallet),
            message: pinMessage(hash, wallet, timestamp),
            signature: signature as Hex,
          });
        } catch {
          signer = false;
        }
        if (!signer) return err(401, "bad_signature", "The wallet signature could not be verified.");

        const { chainClient } = await import("@/lib/chain.server");
        const { readIsAuthorizedIssuer } = await import("@/lib/web3/contract");
        const { isContractConfigured } = await import("@/lib/web3/config");
        if (!isContractConfigured()) return err(503, "contract_not_configured", "The ProofMesh contract is not configured.");
        let authorized = false;
        try {
          authorized = await readIsAuthorizedIssuer(chainClient(), getAddress(wallet));
        } catch {
          return err(503, "rpc_unavailable", "The Sepolia network could not be reached.");
        }
        if (!authorized) return err(403, "unauthorized_issuer", "This wallet is not an authorized issuer in the contract.");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing } = await supabaseAdmin
          .from("document_pins")
          .select("ipfs_cid")
          .eq("document_hash", hash)
          .maybeSingle();
        if (existing) return json(200, { ok: true, cid: existing.ipfs_cid, documentHash: hash, reused: true });

        let cid: string;
        try {
          cid = await pinPdfToIpfs(bytes, file.name, hash);
        } catch {
          return err(502, "ipfs_failed", "The document could not be stored on IPFS. Try again.");
        }
        const { error } = await supabaseAdmin.from("document_pins").upsert({
          document_hash: hash,
          ipfs_cid: cid,
          pinned_by: wallet.toLowerCase(),
          size_bytes: bytes.byteLength,
        });
        if (error) return err(503, "db_unavailable", "The document was stored but the registry could not be updated.");
        void dispatchToN8n("document.pinned", { documentHash: hash, cid, issuerWallet: wallet.toLowerCase() });
        return json(200, { ok: true, cid, documentHash: hash, reused: false });
      },
    },
  },
});
