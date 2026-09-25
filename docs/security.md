# ProofMesh security model

## Controls
- **Secrets**: only public values use the `VITE_` prefix. `PINATA_JWT`, `SEPOLIA_RPC_URL`, `N8N_WEBHOOK_SECRET` and the service-role key are read inside server handlers only. `DEPLOYER_PRIVATE_KEY` lives only in the deployer's shell.
- **Wallet**: the app never requests, stores or transmits private keys, seed phrases or wallet passwords. Every transaction and the IPFS upload approval are signed in MetaMask by the user.
- **Contract**: issuer authorization, duplicate prevention, revoke-by-original-issuer and final revocation are enforced on-chain with custom errors (12 Hardhat tests).
- **Database**: RLS on every table. Public can read credentials and issuers only. No public writes; verification events are written only by a SECURITY DEFINER function that computes the result itself and throttles repeats. `document_pins` and `rate_limits` are server-only. All queries use the official client (parameterized).
- **Chain is authoritative**: index rows are written only from values read from the contract/receipts; clients cannot set ACTIVE, change hashes or un-revoke.
- **Uploads**: treated as untrusted. Extension, MIME, size (10 MB), `%PDF-` magic bytes and `%%EOF` checked in the browser and again on the server; server re-hashes and compares; files are never parsed, rendered or executed; the server does not serve uploaded files.
- **IPFS endpoint**: requires a fresh (≤10 min) wallet signature from a wallet the contract says is authorized; rate-limited to 20/hour per client.
- **Verification**: rate-limited to 60/min per client (hashed IP, raw IPs not stored). Verification events store only credential ID, type, result and time.
- **n8n**: inbound/outbound payloads HMAC-signed; payloads contain only public proof metadata.
- **Errors**: raw stack traces and database errors never reach the browser.

## Honest limitations
- A blockchain proof shows that a specific fingerprint was registered by a specific wallet under the contract rules. It does **not** prove the credential's real-world claims are true.
- A matching hash does not prove the issuer's underlying claim is legitimate.
- A wallet address is not a verified real-world identity.
- IPFS availability depends on pinning/provider infrastructure (Pinata). Unpinned content can disappear.
- Ethereum Sepolia is a **testnet**: no production finality or economic security.
- Re-saving or re-exporting a PDF changes its hash.
- Documents on public IPFS are retrievable by anyone with the CID — do not issue documents containing sensitive personal data.
- Not implemented: zero-knowledge proofs, selective disclosure, advanced identity binding, liveness verification, account abstraction.
