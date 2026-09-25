import { createHmac, createHash, timingSafeEqual } from "crypto";

/* ------------------------------- IPFS (Pinata) ------------------------------- */

export const ipfsConfigured = () => Boolean(process.env["PINATA_JWT"]);

export async function pinPdfToIpfs(bytes: Uint8Array, name: string, documentHash: string): Promise<string> {
  const jwt = process.env["PINATA_JWT"];
  if (!jwt) throw new Error("ipfs_not_configured");
  const form = new FormData();
  form.append("file", new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), name.replace(/[^\w.\-]/g, "_").slice(0, 80));
  form.append("pinataMetadata", JSON.stringify({ name: `proofmesh-${documentHash.slice(2, 14)}`, keyvalues: { sha256: documentHash } }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    console.error("[ipfs] pin failed", res.status);
    throw new Error("ipfs_failed");
  }
  const json = (await res.json()) as { IpfsHash?: string };
  if (!json.IpfsHash || !/^[a-zA-Z0-9]{46,80}$/.test(json.IpfsHash)) throw new Error("ipfs_failed");
  return json.IpfsHash;
}

/* ----------------------------------- n8n ------------------------------------ */

export const n8nConfigured = () => Boolean(process.env["N8N_WEBHOOK_URL"] && process.env["N8N_WEBHOOK_SECRET"]);

export function signBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifySignature(body: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(signBody(body, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Notify the n8n workflow of a pipeline event. Payloads contain only public proof metadata
 * (IDs, hashes, CIDs, tx hashes) — never keys, never documents. Failures are reported to
 * the caller but never block the user-signed blockchain flow.
 */
export async function dispatchToN8n(event: string, payload: Record<string, unknown>): Promise<"sent" | "not_configured" | "failed"> {
  const url = process.env["N8N_WEBHOOK_URL"];
  const secret = process.env["N8N_WEBHOOK_SECRET"];
  if (!url || !secret) return "not_configured";
  const body = JSON.stringify({ event, at: new Date().toISOString(), payload });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-proofmesh-signature": signBody(body, secret) },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

/* -------------------------------- Rate limit -------------------------------- */

/** Returns true when allowed. The client IP is hashed; raw IPs are never stored. */
export async function rateLimit(scope: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { getRequestIP } = await import("@tanstack/react-start/server");
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const bucket = `${scope}:${createHash("sha256").update(`pm:${ip}`).digest("hex").slice(0, 32)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
      _bucket: bucket,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) return true; // fail open on limiter errors; the DB throttle still applies
    return data !== false;
  } catch {
    return true;
  }
}
