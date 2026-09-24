import { z } from "zod";

import { CREDENTIAL_STATUSES, CREDENTIAL_TYPES } from "./proofmesh";

/** Validation shared by the client and the server boundary. The server always re-validates. */
export const credentialIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^PM-\d{6}$/, "Use the format PM-000001.");

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid wallet address.")
  .transform((value) => value.toLowerCase());

export const documentHashSchema = z
  .string()
  .trim()
  .transform((value) => (value.startsWith("0x") ? value : `0x${value}`).toLowerCase())
  .pipe(z.string().regex(/^0x[0-9a-f]{64}$/, "Expected a SHA-256 hex digest."));

export const credentialTypeSchema = z.enum(CREDENTIAL_TYPES as [string, ...string[]]);
export const credentialStatusSchema = z.enum(CREDENTIAL_STATUSES as [string, ...string[]]);
export const verificationTypeSchema = z.enum(["credential_id", "qr", "document", "public_link"]);

export const createCredentialSchema = z.object({
  credentialId: credentialIdSchema,
  issuerWallet: walletAddressSchema,
  credentialType: credentialTypeSchema,
  documentHash: documentHashSchema,
});

/** Clients may only request revocation or flag an error; activation comes from the chain. */
export const updateStatusSchema = z.object({
  credentialId: credentialIdSchema,
  status: z.enum(["REVOKED", "ERROR"]),
});
