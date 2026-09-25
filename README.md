# ProofMesh

Web3 credential verification MVP: **document → SHA-256 → Ethereum Sepolia proof → independent verification.**
Built with TanStack Start (React + TypeScript), viem + MetaMask, Solidity/Hardhat, Lovable Cloud (PostgreSQL), IPFS via Pinata, and n8n.

- Architecture: [docs/architecture.md](docs/architecture.md)
- Security & limitations: [docs/security.md](docs/security.md)

> Framework note: the original brief specified Next.js/Vercel. This project runs on TanStack Start; `NEXT_PUBLIC_*` variables are `VITE_*` here. Server-only secrets never use the `VITE_` prefix.

## Environment variables
See `.env.example`. In Lovable, server secrets (`PINATA_JWT`, `SEPOLIA_RPC_URL`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`) are set as project secrets, not in a committed file.

## Setup
1. **Database** — migrations in `supabase/migrations` (applied automatically on Lovable Cloud).
2. **Contract** — see `contracts/README.md`:
   ```sh
   cd contracts && npm install && npm test
   SEPOLIA_RPC_URL=... DEPLOYER_PRIVATE_KEY=... npm run deploy:sepolia   # writes src/lib/web3/deployment.json
   ISSUER_ADDRESS=0xYourIssuer SEPOLIA_RPC_URL=... DEPLOYER_PRIVATE_KEY=... npm run authorize:sepolia
   ```
   Use a testnet-only wallet funded from a Sepolia faucet.
3. **MetaMask** — install, add/switch to Sepolia (the app offers a switch button), fund the issuer wallet with test ETH.
4. **IPFS** — create a Pinata account → API Keys → new key with `pinFileToIPFS` → save the JWT as `PINATA_JWT`.
5. **n8n** — import `n8n/proofmesh-issuance.json` and `n8n/proofmesh-verification.json`; set n8n env vars `N8N_WEBHOOK_SECRET` and `PROOFMESH_APP_URL`; activate; set the app's `N8N_WEBHOOK_URL` to the issuance webhook URL and the same `N8N_WEBHOOK_SECRET`.
6. **Local dev** — `bun install && bun run dev`.

## Testing
- Contract: `cd contracts && npm test` (authorization, registration, verification, revocation).
- App: type-check with `bunx tsgo --noEmit`; the flows below end-to-end.

## Demo flow
**Issuer**: Connect MetaMask → Issue → upload `certificate.pdf` → validated + SHA-256 → approve upload signature → PDF pinned to IPFS → approve `registerCredential` → Sepolia confirmation → index synced (CID, tx, block) → credential ID `PM-00000N` + QR shown.
**Verifier**: scan the QR → `/verify/PM-00000N` → contract read → **VERIFIED**.
**Tamper test**: edit the PDF → Verify → Document tab → same ID + edited file → **DOCUMENT INTEGRITY FAILED** with both hashes.
**Revocation**: open the credential as the issuer → Revoke → MetaMask → confirmation → verify again → **CREDENTIAL REVOKED**.

## Deployment
Publish from Lovable. Set the contract address via `deployment.json` or `VITE_CONTRACT_ADDRESS`, and the server secrets above. Anything unconfigured shows "Integration not configured" rather than fake data.

## Limitations
See [docs/security.md](docs/security.md#honest-limitations). Sepolia is a testnet; a proof shows registration, not truth of the credential's claims.
