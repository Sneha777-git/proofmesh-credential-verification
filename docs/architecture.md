# ProofMesh architecture

```text
Browser (TanStack Start + React + TypeScript)
  │  SHA-256 in browser (crypto.subtle) ──► bytes32 documentHash
  ▼
MetaMask + viem ── signs: (1) IPFS upload approval message, (2) registerCredential / revokeCredential tx
  ▼
Ethereum Sepolia ── CredentialRegistry.sol: hash, issuer, issuedAt, revoked, type   (source of truth)
  ▼
Server functions / routes ── validate, re-hash, rate-limit, read chain, sync index
  ├─► Lovable Cloud (PostgreSQL + RLS) ── metadata & index: credentials, issuers, verification_events, document_pins
  ├─► IPFS via Pinata ── the actual PDF (CID stored in the database)
  └─► n8n ── HMAC-signed pipeline events; verification workflow calls /api/public/verify
```

| Layer | Holds | Never holds |
|---|---|---|
| IPFS | credential PDF | keys, personal identity data beyond the document |
| Database | IDs, hashes, CIDs, tx hashes, block numbers, status | PDFs, keys |
| Ethereum | fingerprint, issuer, time, type, revoked flag | document, personal data |
| MetaMask | user keys & signing | — (ProofMesh never sees keys) |
| n8n | workflow coordination | keys, seed phrases, documents |

## Hashing
One scheme only: `SHA-256(raw file bytes)` → 32 bytes → `0x` + 64 lowercase hex = Solidity `bytes32`.
Browser: `sha256File` (`src/lib/web3/config.ts`). Server: Node `crypto` over the same bytes in `/api/public/ipfs-pin`, which rejects the upload if they differ.

## Credential IDs
Sequential on-chain `uint256` assigned by the contract; `1 ⇔ PM-000001` (`formatCredentialId` / `parseCredentialId`).

## Issuance
1. Connect MetaMask (Sepolia). Contract confirms `isAuthorizedIssuer`.
2. Choose PDF → validated (extension, MIME, ≤10 MB, `%PDF-` magic, `%%EOF`) → SHA-256.
3. Issuer signs an upload-approval message (no gas). Server verifies signature, re-validates and re-hashes, checks authorization on-chain, pins to Pinata, stores `hash → CID` in `document_pins`.
4. `registerCredential(hash, type)` simulated, then signed in MetaMask, submitted, confirmed.
5. `syncFromChain` reads the credential **from the contract** and the tx receipt, upserts the index (with CID) and emits an n8n event.
6. Credential ID + QR shown only after confirmation.

## Verification (no wallet)
Server reads the contract (`getCredential`, `verifyCredential(id, hash)`), refreshes a stale index from chain, records a verification event (credential_id / qr / document / public_link) via a SECURITY DEFINER function, and returns: VERIFIED, DOCUMENT INTEGRITY FAILED, CREDENTIAL REVOKED, CREDENTIAL NOT FOUND, or INTEGRATION NOT CONFIGURED / unavailable. If the index can't be refreshed the UI follows the chain and says the index is out of date.

## Revocation
`revokeCredential(id)` in MetaMask → confirmation → `syncFromChain` mirrors `revoked = true` → status REVOKED. The database is never updated first.

## n8n
The app POSTs `document.pinned`, `credential.registered`, `credential.revoked`, `verification.completed` to `N8N_WEBHOOK_URL`, signed with `x-proofmesh-signature = HMAC-SHA256(body, N8N_WEBHOOK_SECRET)`. Import `n8n/proofmesh-issuance.json` and `n8n/proofmesh-verification.json`. n8n is optional for the user flow: if it's down, the signed transaction still completes and the failure is logged.
