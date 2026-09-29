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

# 🔐 ProofMesh

### Decentralized Credential Verification using Blockchain, IPFS & Cryptographic Proofs

ProofMesh is a Web3-based credential verification system that allows digital credentials to be issued, stored, verified, and revoked using **cryptographic hashing, IPFS, and Ethereum**.

Instead of relying entirely on a centralized verification database, ProofMesh anchors a credential's cryptographic fingerprint on the blockchain, allowing its authenticity to be independently verified.

---

## ✨ Features

- 📄 **Credential Issuance**
- 🔐 **SHA-256 Document Hashing**
- 🌐 **IPFS Storage**
- ⛓️ **Ethereum Sepolia Integration**
- 🦊 **MetaMask Wallet Authentication**
- ✅ **Credential Verification**
- 🚫 **Credential Revocation**
- 🔑 **Issuer Authorization**
- 📱 **QR-Based Verification**
- 🔍 **On-Chain Credential Lookup**

---

# 🔄 How ProofMesh Works

## 📤 Issuance

1. An authorized issuer selects a credential PDF.
2. ProofMesh calculates the document's **SHA-256 hash**.
3. The document is uploaded to **IPFS through Pinata**.
4. The credential hash is registered on **Ethereum Sepolia**.
5. The blockchain stores the credential proof, issuer, timestamp, credential type, and revocation state.
6. The credential can subsequently be independently verified.

### Issuance Flow

```text
Credential PDF
      │
      ▼
SHA-256 Hash
      │
      ▼
Upload to IPFS
      │
      ▼
Register Hash
      │
      ▼
Ethereum Sepolia
      │
      ▼
Verified Credential

🔎 Verification
A verifier uploads the credential.
ProofMesh calculates the document's SHA-256 hash.
The hash is checked against the blockchain registry.
The credential's blockchain state is retrieved.
ProofMesh reports whether the credential is valid or revoked.
Credential
    │
    ▼
SHA-256 Hash
    │
    ▼
Blockchain Registry
    │
    ├───────────────┐
    ▼               ▼
  VALID           REVOKED

The blockchain acts as the source of truth for credential registration and revocation.

.

🏗️ Tech Stack
🎨 Frontend
Technology	Purpose
React	UI development
TypeScript	Type-safe development
TanStack Start	Full-stack React framework
TanStack Router	Application routing
TanStack Query	Server state management
Tailwind CSS	Styling
Vite	Development and build tooling
⛓️ Blockchain
Technology	Purpose
Solidity	Smart contract development
Hardhat	Smart contract development & deployment
Ethereum Sepolia	Blockchain network
viem	Ethereum interaction
MetaMask	Wallet authentication
🌐 Decentralized Storage
Technology	Purpose
IPFS	Content-addressed storage
Pinata	IPFS pinning and upload infrastructure
🛠️ Supporting Technologies
Bun
QR Code generation & scanning
SHA-256 cryptographic hashing
⛓️ Smart Contract
CredentialRegistry

The ProofMesh smart contract provides:

🔑 Issuer authorization
📝 Credential registration
🔍 Credential verification
🚫 Credential revocation
📋 Credential lookup
🔢 Credential count tracking
Network

Ethereum Sepolia

Contract Address
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

The original credential document is not stored on the blockchain.

Instead, ProofMesh stores its cryptographic fingerprint on-chain.

This allows the system to verify whether a document matches its registered blockchain proof without putting the complete credential contents onto a public blockchain.

🛡️ Security & Integrity Model

ProofMesh uses multiple layers of integrity.

🔐 SHA-256

Every credential is converted into a deterministic cryptographic hash.

Even a small modification to the document produces a completely different hash.

🌐 IPFS

Documents are stored using content-addressed storage.

The resulting CID (Content Identifier) identifies the stored content.

⛓️ Ethereum

The credential hash is anchored to an on-chain blockchain record.

This provides a tamper-resistant reference for verification.

🦊 Wallet Authentication

Issuer operations require an authorized Ethereum wallet.

🚫 Revocation

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

Before running ProofMesh locally, make sure you have:

Node.js
Bun
Git
MetaMask
Sepolia ETH for blockchain transactions
Pinata account
Pinata API credentials
📥 Installation
1. Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd proofmesh-credential-verification
2. Install dependencies
bun install
3. Configure environment variables

Create your local environment file:

cp .env.example .env.local

Configure the required environment variables, including:

Pinata credentials
Sepolia RPC configuration
Other project-specific configuration

⚠️ Never commit .env.local or private API credentials to GitHub.

4. Start the development server
bun run dev

The application will be available through the local development server.

🧪 Production Build

Create a production build:

bun run build

Preview the production build:

bun run preview
🔄 Credential Lifecycle
┌──────────────┐
│    CREATE    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     HASH     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ UPLOAD IPFS  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  REGISTER    │
│ ON BLOCKCHAIN│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    VERIFY    │
└──────┬───────┘
       │
       ├───────────────┐
       ▼               ▼
   ┌───────┐       ┌─────────┐
   │ VALID │       │ REVOKED │
   └───────┘       └─────────┘
🎯 Why Blockchain?

Traditional credential verification often depends on a centralized institution or database.

ProofMesh explores an alternative model where a credential's cryptographic fingerprint is anchored to a blockchain.

Traditional Model
Student
   │
   ▼
Institution Database
   │
   ▼
Verifier
ProofMesh Model
Student
   │
   ▼
Credential
   │
   ▼
Cryptographic Hash
   │
   ▼
Blockchain Proof
   │
   ▼
Verifier

The verifier can independently check whether the credential's fingerprint corresponds to a registered blockchain record.

🔒 Privacy

ProofMesh does not put the original credential contents directly on-chain.

The blockchain stores:

Document hash
Issuer address
Timestamp
Credential type
Revocation state

The complete credential itself is not stored inside the blockchain registry.

Sensitive credential information should not be exposed through the public blockchain registry.

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
 Lovable integration removed
 Production-ready repository structure
📌 Project Purpose

ProofMesh is a student-built Web3 project exploring how cryptographic proofs, decentralized storage, and blockchain infrastructure can be combined to create verifiable digital credentials.

The project is intended as a technical demonstration and learning project, rather than a replacement for official institutional credential systems.

📜 License

This project is provided for educational and demonstration purposes.


### One correction from your original

I deliberately removed this garbage from the bottom:

```text
'@ | Set-Content README.md

and the unfinished PowerShell command:

Then verify the cleanup

Run:
