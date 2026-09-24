import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { ChainState } from "./chain.server";
import { fail, type AppResult } from "./errors";
import type { Credential, Issuer, VerificationEvent, VerificationResultCode } from "./proofmesh";
import {
  createCredentialSchema,
  credentialIdSchema,
  documentHashSchema,
  updateStatusSchema,
  verificationTypeSchema,
  walletAddressSchema,
} from "./validation";

function safeParse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> | null {
  const parsed = schema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

async function publicDb() {
  const { createPublicClient } = await import("./credentials.server");
  return createPublicClient();
}

/* ---------- Public (no account needed) ---------- */

export const fetchCredential = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => input)
  .handler(async ({ data }): Promise<AppResult<Credential>> => {
    const id = safeParse(credentialIdSchema, (data as { credentialId?: unknown })?.credentialId);
    if (!id) return fail("invalid_input");
    try {
      const svc = await import("./credentials.server");
      return await svc.getCredentialByCredentialId(await publicDb(), id);
    } catch {
      return fail("unavailable");
    }
  });

export const verifyCredentialRecord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input)
  .handler(
    async ({
      data,
    }): Promise<
      AppResult<{ result: VerificationResultCode; credential: Credential | null; chain: ChainState }>
    > => {
      const parsed = safeParse(
        z.object({
          credentialId: credentialIdSchema,
          type: verificationTypeSchema,
          documentHash: documentHashSchema.optional(),
        }),
        data,
      );
      if (!parsed) return fail("invalid_input");
      try {
        const chainMod = await import("./chain.server");
        const { parseCredentialId } = await import("./web3/config");
        const numericId = parseCredentialId(parsed.credentialId);
        const chain = numericId
          ? await chainMod.readChainState(numericId, parsed.documentHash as `0x${string}` | undefined)
          : await chainMod.readChainState(0n);

        const svc = await import("./credentials.server");
        const db = await publicDb();
        let credential = await svc.getCredentialByCredentialId(db, parsed.credentialId);
        // Keep the index in step with the chain (source of truth) when they disagree.
        if (numericId && chain.exists) {
          const stale =
            !credential.ok ||
            credential.data.status !== (chain.revoked ? "REVOKED" : "ACTIVE") ||
            !credential.data.transactionHash;
          if (stale) {
            await chainMod.syncCredentialFromChain(numericId).catch(() => undefined);
            credential = await svc.getCredentialByCredentialId(db, parsed.credentialId);
          }
        }
        const recorded = await svc.createVerificationEvent(db, parsed.credentialId, parsed.type);
        const result: VerificationResultCode = recorded.ok ? recorded.data : "not_found";
        return {
          ok: true,
          data: { result, credential: credential.ok ? credential.data : null, chain },
        };
      } catch (error) {
        console.error("[verify]", error instanceof Error ? error.message : error);
        return fail("unavailable");
      }
    },
  );

/** Public but safe: the caller only names an ID; every stored value is read from the chain. */
export const syncFromChain = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input)
  .handler(async ({ data }): Promise<AppResult<Credential>> => {
    const parsed = safeParse(
      z.object({
        credentialId: credentialIdSchema,
        txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
      }),
      data,
    );
    if (!parsed) return fail("invalid_input");
    try {
      const { parseCredentialId } = await import("./web3/config");
      const id = parseCredentialId(parsed.credentialId);
      if (!id) return fail("invalid_input");
      const chainMod = await import("./chain.server");
      const res = await chainMod.syncCredentialFromChain(id, parsed.txHash as `0x${string}` | undefined);
      if (!res.ok) return fail(res.reason === "not_found" ? "not_found" : "unavailable");
      const svc = await import("./credentials.server");
      return svc.getCredentialByCredentialId(await publicDb(), parsed.credentialId);
    } catch (error) {
      console.error("[sync]", error instanceof Error ? error.message : error);
      return fail("unavailable");
    }
  });

export const fetchRegistryOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    AppResult<{
      credentials: Credential[];
      verifications: number;
      issuers: { total: number; authorized: number };
    }>
  > => {
    try {
      const svc = await import("./credentials.server");
      const db = await publicDb();
      const [credentials, verifications, issuers] = await Promise.all([
        svc.listCredentials(db),
        svc.countVerifications(db),
        svc.countIssuers(db),
      ]);
      if (!credentials.ok) return credentials;
      if (!verifications.ok) return verifications;
      if (!issuers.ok) return issuers;
      return {
        ok: true,
        data: { credentials: credentials.data, verifications: verifications.data, issuers: issuers.data },
      };
    } catch {
      return fail("unavailable");
    }
  },
);

export const fetchIssuer = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => input)
  .handler(async ({ data }): Promise<AppResult<Issuer | null>> => {
    const wallet = safeParse(walletAddressSchema, (data as { wallet?: unknown })?.wallet);
    if (!wallet) return fail("invalid_input");
    try {
      const svc = await import("./credentials.server");
      return await svc.getIssuer(await publicDb(), wallet);
    } catch {
      return fail("unavailable");
    }
  });

/* ---------- Issuer-only (signed in; authorization enforced by database policies) ---------- */

export const issueCredentialRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input)
  .handler(async ({ data, context }): Promise<AppResult<Credential>> => {
    const parsed = safeParse(createCredentialSchema, data);
    if (!parsed) return fail("invalid_input");
    const svc = await import("./credentials.server");
    return svc.createCredential(context.supabase, parsed);
  });

export const changeCredentialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input)
  .handler(async ({ data, context }): Promise<AppResult<Credential>> => {
    const parsed = safeParse(updateStatusSchema, data);
    if (!parsed) return fail("invalid_input");
    const svc = await import("./credentials.server");
    return svc.updateCredentialStatus(context.supabase, parsed.credentialId, parsed.status);
  });

export const fetchVerificationHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input)
  .handler(async ({ data, context }): Promise<AppResult<VerificationEvent[]>> => {
    const id = safeParse(credentialIdSchema, (data as { credentialId?: unknown })?.credentialId);
    if (!id) return fail("invalid_input");
    const svc = await import("./credentials.server");
    return svc.getVerificationHistory(context.supabase, id);
  });
