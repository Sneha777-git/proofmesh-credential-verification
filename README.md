@'
# ProofMesh

> **Verify Trust. Prove Authenticity.**

ProofMesh is a decentralized credential verification system that combines **SHA-256 document fingerprinting, IPFS, and Ethereum** to create independently verifiable digital credentials.

Instead of trusting a PDF or relying entirely on a centralized database, ProofMesh generates a cryptographic fingerprint of a credential and anchors that proof on the Ethereum Sepolia testnet.

---

## ✨ Features

- 📄 **Document hashing** using SHA-256
- 🌐 **Decentralized storage** through IPFS and Pinata
- ⛓️ **Blockchain anchoring** on Ethereum Sepolia
- 🦊 **MetaMask wallet integration**
- 🔐 **Issuer authorization**
- 🚫 **Credential revocation**
- 🔎 **Independent credential verification**
- 📱 **QR-based credential verification**
- ⚡ **Modern React + TanStack Start interface**

---

## 🧠 How ProofMesh Works

```text
                 ┌──────────────────┐
                 │   Credential PDF │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   SHA-256 Hash   │
                 └────────┬─────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
       ┌────────────────┐   ┌──────────────────┐
       │   IPFS / Pinata│   │ Ethereum Sepolia │
       │   Document     │   │ CredentialRegistry│
       └────────────────┘   └─────────┬────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │ Credential Proof│
                             └────────┬────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │    Verify       │
                             └─────────────────┘

Issuance
An issuer selects a credential PDF.
ProofMesh calculates its SHA-256 hash.
The document is uploaded to IPFS through Pinata.
The credential hash is registered on Ethereum Sepolia.
The blockchain stores the credential proof, issuer, timestamp, type, and revocation state.
The credential can subsequently be independently verified.
Verification
A verifier uploads the credential.
ProofMesh calculates the document's SHA-256 hash.
The hash is checked against the blockchain registry.
The credential's blockchain state is retrieved.
ProofMesh reports whether the credential is valid or revoked.

The blockchain acts as the source of truth for credential registration and revocation.

🏗️ Tech Stack
Frontend
React
TypeScript
TanStack Start
TanStack Router
TanStack Query
Tailwind CSS
Vite
Blockchain
Solidity
Hardhat
Ethereum Sepolia
viem
MetaMask
Storage
IPFS
Pinata
Supporting Technologies
Bun
QR Code generation/scanning
SHA-256 cryptographic hashing
⛓️ Smart Contract

CredentialRegistry

The ProofMesh smart contract provides:

Issuer authorization
Credential registration
Credential verification
Credential revocation
Credential lookup
Credential count tracking
Deployed Contract

Network: Ethereum Sepolia

Contract Address:

0xa76f623d6516bf1256945df923bb0cf1d563324f

The contract is deployed on-chain and can be independently inspected using a Sepolia-compatible blockchain explorer.

🔐 Credential Data

Each registered credential contains:

struct Credential {
    bytes32 documentHash;
    address issuer;
    uint256 issuedAt;
    bool revoked;
    string credentialType;
}

The document itself is not stored on the blockchain.

Instead, ProofMesh stores its cryptographic fingerprint on-chain.

This allows verification without putting the original credential contents onto a public blockchain.

🛡️ Security Model

ProofMesh uses several layers of integrity:

SHA-256

Every credential is converted into a deterministic cryptographic hash.

Even a small modification to the document produces a different hash.

IPFS

Documents are stored using content-addressed storage.

The resulting CID identifies the stored content.

Ethereum

The credential hash is anchored to an immutable blockchain record.

Wallet Authentication

Issuer operations require an authorized Ethereum wallet.

Revocation

Authorized issuers can revoke credentials when necessary.

📁 Project Structure
proofmesh-credential-verification/
│
├── contracts/
│   ├── contracts/
│   │   └── CredentialRegistry.sol
│   ├── scripts/
│   └── hardhat.config.ts
│
├── src/
│   ├── components/
│   │   ├── pm/
│   │   └── ui/
│   │
│   ├── integrations/
│   │
│   ├── lib/
│   │   ├── web3/
│   │   ├── chain.server.ts
│   │   ├── pdf.ts
│   │   ├── proofmesh.ts
│   │   └── validation.ts
│   │
│   └── routes/
│       ├── issue.tsx
│       ├── dashboard.tsx
│       ├── verify.index.tsx
│       ├── verify.$credentialId.tsx
│       └── credentials.$credentialId.tsx
│
├── public/
├── vite.config.ts
├── package.json
└── README.md
⚙️ Local Development
Requirements
Node.js
Bun
Git
MetaMask
Sepolia ETH for blockchain transactions
Pinata account and API credentials
Installation

Clone the repository:

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd proofmesh-credential-verification

Install dependencies:

bun install

Create your local environment file:

cp .env.example .env.local

Configure the required environment variables, including your Pinata credentials and Sepolia RPC configuration.

Start the development server:

bun run dev

The application will be available through the local Vite development server.

🧪 Build

Create a production build:

bun run build

Preview the production build:

bun run preview
🔄 Credential Lifecycle
CREATE
  │
  ▼
HASH
  │
  ▼
UPLOAD TO IPFS
  │
  ▼
REGISTER ON BLOCKCHAIN
  │
  ▼
VERIFY
  │
  ├───────────────┐
  ▼               ▼
VALID           REVOKED
🎯 Why Blockchain?

Traditional credential verification often depends on a centralized institution or database.

ProofMesh explores a different model:

Traditional

Student → Institution Database → Verifier


ProofMesh

Student → Credential
              │
              ▼
        Cryptographic Hash
              │
              ▼
        Blockchain Proof
              │
              ▼
           Verifier

The verifier can independently check whether the credential's fingerprint corresponds to a blockchain record.

🔒 Privacy

ProofMesh does not put the original credential contents directly on-chain.

The blockchain stores the credential's cryptographic fingerprint and associated metadata rather than the complete document.

Sensitive credential information should therefore not be exposed through the blockchain registry itself.

🚀 Project Status

ProofMesh currently supports the core credential lifecycle:

 SHA-256 document hashing
 IPFS upload
 Ethereum Sepolia deployment
 Issuer authorization
 Credential registration
 Credential verification
 Credential revocation
 MetaMask integration
 QR-based verification
 Production build configuration
📌 Project Purpose

ProofMesh is a student-built Web3 project exploring how cryptographic proofs, decentralized storage, and blockchain infrastructure can be combined to create verifiable digital credentials.

It is intended as a technical demonstration and learning project rather than a replacement for official institutional credential systems.

📜 License

This project is provided for educational and demonstration purposes.
'@ | Set-Content README.md


### Then verify the cleanup

Run:

```powershell

This time the command should produce no results at all, including bun.lock.

If it shows something, don't delete anything yet. Paste the result.

Then run:

git status --short
