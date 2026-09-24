import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

import { fail, type AppErrorCode, type AppResult } from "./errors";
import type {
  Credential,
  CredentialStatus,
  CredentialType,
  Issuer,
  VerificationEvent,
  VerificationResultCode,
  VerificationType,
} from "./proofmesh";

type Db = SupabaseClient<Database>;
type CredentialRow = Database["public"]["Tables"]["credentials"]["Row"];
type IssuerRow = Database["public"]["Tables"]["issuers"]["Row"];

const CREDENTIAL_COLUMNS =
  "credential_id, issuer_wallet, credential_type, document_hash, ipfs_cid, transaction_hash, block_number, status, issued_at, revoked_at, created_at, issuers(wallet_address, issuer_name, authorization_status)";

type CredentialWithIssuer = Pick<
  CredentialRow,
  | "credential_id"
  | "issuer_wallet"
  | "credential_type"
  | "document_hash"
  | "ipfs_cid"
  | "transaction_hash"
  | "block_number"
  | "status"
  | "issued_at"
  | "revoked_at"
  | "created_at"
> & { issuers: Pick<IssuerRow, "wallet_address" | "issuer_name" | "authorization_status"> | null };

/** Anonymous server client (RLS applies as a public visitor). */
export function createPublicClient(): Db {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("registry_not_configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function toIssuer(row: Pick<IssuerRow, "wallet_address" | "issuer_name" | "authorization_status">): Issuer {
  return {
    walletAddress: row.wallet_address,
    issuerName: row.issuer_name,
    authorizationStatus: row.authorization_status,
  };
}

function toCredential(row: CredentialWithIssuer): Credential {
  return {
    credentialId: row.credential_id,
    credentialType: row.credential_type as CredentialType,
    issuerWallet: row.issuer_wallet,
    issuer: row.issuers ? toIssuer(row.issuers) : null,
    documentHash: row.document_hash,
    ipfsCid: row.ipfs_cid,
    transactionHash: row.transaction_hash,
    blockNumber: row.block_number,
    status: row.status as CredentialStatus,
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

/** Map Postgres/PostgREST errors to clean application codes. Logs detail server-side only. */
function mapDbError(error: { code?: string; message?: string }): AppErrorCode {
  console.error("[registry]", error.code, error.message);
  switch (error.code) {
    case "23505":
      return "duplicate";
    case "23514":
    case "23503":
    case "22P02":
    case "22023":
      return "constraint";
    case "42501":
      return "forbidden_issuer";
    default:
      return "unavailable";
  }
}

export async function getCredentialByCredentialId(
  db: Db,
  credentialId: string,
): Promise<AppResult<Credential>> {
  const { data, error } = await db
    .from("credentials")
    .select(CREDENTIAL_COLUMNS)
    .eq("credential_id", credentialId)
    .maybeSingle<CredentialWithIssuer>();
  if (error) return fail(mapDbError(error));
  if (!data) return fail("not_found");
  return { ok: true, data: toCredential(data) };
}

/** Internal row UUID lookup (used by future admin/chain sync jobs). */
export async function getCredentialById(db: Db, id: string): Promise<AppResult<Credential>> {
  const { data, error } = await db
    .from("credentials")
    .select(CREDENTIAL_COLUMNS)
    .eq("id", id)
    .maybeSingle<CredentialWithIssuer>();
  if (error) return fail(mapDbError(error));
  if (!data) return fail("not_found");
  return { ok: true, data: toCredential(data) };
}

export async function getIssuer(db: Db, wallet: string): Promise<AppResult<Issuer | null>> {
  const { data, error } = await db
    .from("issuers")
    .select("wallet_address, issuer_name, authorization_status")
    .eq("wallet_address", wallet)
    .maybeSingle();
  if (error) return fail(mapDbError(error));
  return { ok: true, data: data ? toIssuer(data) : null };
}

export async function listCredentials(db: Db, issuerWallet?: string): Promise<AppResult<Credential[]>> {
  let query = db.from("credentials").select(CREDENTIAL_COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (issuerWallet) query = query.eq("issuer_wallet", issuerWallet);
  const { data, error } = await query.returns<CredentialWithIssuer[]>();
  if (error) return fail(mapDbError(error));
  return { ok: true, data: (data ?? []).map(toCredential) };
}

export const getIssuerCredentials = (db: Db, wallet: string) => listCredentials(db, wallet);

export async function countIssuers(db: Db): Promise<AppResult<{ total: number; authorized: number }>> {
  const [all, authorized] = await Promise.all([
    db.from("issuers").select("id", { count: "exact", head: true }),
    db.from("issuers").select("id", { count: "exact", head: true }).eq("authorization_status", "authorized"),
  ]);
  const error = all.error ?? authorized.error;
  if (error) return fail(mapDbError(error));
  return { ok: true, data: { total: all.count ?? 0, authorized: authorized.count ?? 0 } };
}

export async function countVerifications(db: Db): Promise<AppResult<number>> {
  const { data, error } = await db.rpc("verification_event_count");
  if (error) return fail(mapDbError(error));
  return { ok: true, data: Number(data ?? 0) };
}

export async function createCredential(
  db: Db,
  input: { credentialId: string; issuerWallet: string; credentialType: string; documentHash: string },
): Promise<AppResult<Credential>> {
  const { error } = await db.from("credentials").insert({
    credential_id: input.credentialId,
    issuer_wallet: input.issuerWallet,
    credential_type: input.credentialType as CredentialType,
    document_hash: input.documentHash,
    status: "PENDING",
  });
  if (error) {
    // RLS rejections surface as 42501: the caller is not an authorized issuer for that wallet.
    return fail(mapDbError(error));
  }
  return getCredentialByCredentialId(db, input.credentialId);
}

export async function updateCredentialStatus(
  db: Db,
  credentialId: string,
  status: "REVOKED" | "ERROR",
): Promise<AppResult<Credential>> {
  const { data, error } = await db
    .from("credentials")
    .update({ status })
    .eq("credential_id", credentialId)
    .select("credential_id");
  if (error) return fail(mapDbError(error));
  // RLS hides rows the caller may not modify, so zero rows means not permitted or not found.
  if (!data || data.length === 0) return fail("forbidden_issuer");
  return getCredentialByCredentialId(db, credentialId);
}

/** The database computes the result itself; callers cannot supply or forge it. */
export async function createVerificationEvent(
  db: Db,
  credentialId: string,
  type: VerificationType,
): Promise<AppResult<VerificationResultCode>> {
  const { data, error } = await db.rpc("record_verification", {
    _credential_id: credentialId,
    _type: type,
  });
  if (error) return fail(mapDbError(error));
  return { ok: true, data: data as VerificationResultCode };
}

export async function getVerificationHistory(
  db: Db,
  credentialId: string,
): Promise<AppResult<VerificationEvent[]>> {
  const { data, error } = await db
    .from("verification_events")
    .select("id, credential_id, verification_type, result, created_at")
    .eq("credential_id", credentialId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return fail(mapDbError(error));
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      credentialId: row.credential_id,
      verificationType: row.verification_type,
      result: row.result,
      createdAt: row.created_at,
    })),
  };
}
