# ProofMesh contracts (Hardhat, Ethereum Sepolia Testnet)

```bash
cd contracts
npm install
npm test                      # compiles + runs the CredentialRegistry test suite

# Deploy — set these in YOUR shell only. Never commit them or put them in the app.
export SEPOLIA_RPC_URL=https://...
export DEPLOYER_PRIVATE_KEY=0x...   # a throwaway testnet deployer key
npm run deploy:sepolia        # writes src/lib/web3/deployment.json (public address + block)

# Authorize an issuer wallet (run as the deployer/owner)
ISSUER_ADDRESS=0x... npm run authorize:sepolia
```

- Credential IDs are sequential on-chain integers, shown as `PM-` plus 6 digits (1 → PM-000001).
- The document hash is the SHA-256 digest of the exact file bytes, stored as `bytes32`.
- The app reads the address from `VITE_CONTRACT_ADDRESS` / `VITE_CHAIN_ID`, and falls back to `deployment.json`.
