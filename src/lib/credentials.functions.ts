import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { fail, type AppResult } from "./errors";
import type { Credential, Issuer, VerificationEvent, VerificationResultCode } from "./proofmesh";
import {
  createCredentialSchema,
  credentialIdSchema,
  updateStatusSchema,
  verificationTypeSchema,
  walletAddressSchema,
} from "./validation";

function safeParse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T | null {
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
    }): Promise<AppResult<{ result: VerificationResultCode; credential: Credential | null }>> => {
      const parsed = safeParse(
        z.object({ credentialId: credentialIdSchema, type: verificationTypeSchema }),
        data,
      );
      if (!parsed) return fail("invalid_input");
      try {
        const svc = await import("./credentials.server");
        const db = await publicDb();
        const recorded = await svc.createVerificationEvent(db, parsed.credentialId, parsed.type);
        if (!recorded.ok) return recorded;
        if (recorded.data === "not_found") return { ok: true, data: { result: "not_found", credential: null } };
        const credential = await svc.getCredentialByCredentialId(db, parsed.credentialId);
        return { ok: true, data: { result: recorded.data, credential: credential.ok ? credential.data : null } };
      } catch {
        return fail("unavailable");
      }
    },
  );

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
