import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, sha256, toHex, zeroHash } from "viem";

/** Same conversion the app uses: SHA-256 of the exact bytes, as a 0x-prefixed bytes32. */
const docHash = (text: string) => sha256(toHex(text));

async function expectRevert(promise: Promise<unknown>, errorName: string) {
  try {
    await promise;
  } catch (error) {
    expect(String((error as Error).message)).to.include(errorName);
    return;
  }
  expect.fail(`Expected revert with ${errorName}`);
}

async function deploy() {
  const [owner, issuer, outsider, issuer2] = await hre.viem.getWalletClients();
  const registry = await hre.viem.deployContract("CredentialRegistry");
  const publicClient = await hre.viem.getPublicClient();
  const asIssuer = await hre.viem.getContractAt("CredentialRegistry", registry.address, { client: { wallet: issuer! } });
  const asOutsider = await hre.viem.getContractAt("CredentialRegistry", registry.address, { client: { wallet: outsider! } });
  const asIssuer2 = await hre.viem.getContractAt("CredentialRegistry", registry.address, { client: { wallet: issuer2! } });
  return { registry, publicClient, owner: owner!, issuer: issuer!, outsider: outsider!, issuer2: issuer2!, asIssuer, asOutsider, asIssuer2 };
}

async function deployWithIssuer() {
  const ctx = await deploy();
  await ctx.registry.write.authorizeIssuer([ctx.issuer.account.address]);
  return ctx;
}

describe("CredentialRegistry", () => {
  describe("issuer authorization", () => {
    it("authorizes an issuer, emits an event and reports it", async () => {
      const { registry, issuer, owner, publicClient } = await loadFixture(deploy);
      expect(await registry.read.isAuthorizedIssuer([issuer.account.address])).to.equal(false);
      const tx = await registry.write.authorizeIssuer([issuer.account.address]);
      await publicClient.waitForTransactionReceipt({ hash: tx });
      expect(await registry.read.isAuthorizedIssuer([issuer.account.address])).to.equal(true);
      const events = await registry.getEvents.IssuerAuthorized();
      expect(events).to.have.lengthOf(1);
      expect(events[0]!.args.issuer).to.equal(getAddress(issuer.account.address));
      expect(events[0]!.args.authorizedBy).to.equal(getAddress(owner.account.address));
    });

    it("removes an issuer and reports the removal", async () => {
      const { registry, issuer } = await loadFixture(deployWithIssuer);
      await registry.write.removeAuthorizedIssuer([issuer.account.address]);
      expect(await registry.read.isAuthorizedIssuer([issuer.account.address])).to.equal(false);
      expect(await registry.getEvents.IssuerAuthorizationRemoved()).to.have.lengthOf(1);
    });

    it("only the owner manages issuers", async () => {
      const { asOutsider, outsider } = await loadFixture(deploy);
      await expectRevert(asOutsider.write.authorizeIssuer([outsider.account.address]), "NotOwner");
    });

    it("rejects zero address, double authorization and removing a non-issuer", async () => {
      const { registry, issuer, outsider } = await loadFixture(deployWithIssuer);
      await expectRevert(registry.write.authorizeIssuer(["0x0000000000000000000000000000000000000000"]), "InvalidAddress");
      await expectRevert(registry.write.authorizeIssuer([issuer.account.address]), "IssuerAlreadyAuthorized");
      await expectRevert(registry.write.removeAuthorizedIssuer([outsider.account.address]), "IssuerNotAuthorized");
    });
  });

  describe("registration", () => {
    it("lets an authorized issuer register with sequential IDs", async () => {
      const { registry, asIssuer, issuer } = await loadFixture(deployWithIssuer);
      await asIssuer.write.registerCredential([docHash("doc-1"), "Course"]);
      await asIssuer.write.registerCredential([docHash("doc-2"), "Academic"]);
      expect(await registry.read.credentialCount()).to.equal(2n);
      const c = await registry.read.getCredential([2n]);
      expect(c.documentHash).to.equal(docHash("doc-2"));
      expect(c.issuer).to.equal(getAddress(issuer.account.address));
      expect(c.credentialType).to.equal("Academic");
      expect(c.revoked).to.equal(false);
      expect(c.issuedAt > 0n).to.equal(true);
      const events = await registry.getEvents.CredentialRegistered({ credentialId: 2n });
      expect(events[0]!.args.documentHash).to.equal(docHash("doc-2"));
      expect(await registry.read.credentialIdByHash([docHash("doc-2")])).to.equal(2n);
    });

    it("blocks unauthorized and de-authorized issuers", async () => {
      const { registry, asOutsider, asIssuer, issuer } = await loadFixture(deployWithIssuer);
      await expectRevert(asOutsider.write.registerCredential([docHash("x"), "Course"]), "IssuerNotAuthorized");
      await registry.write.removeAuthorizedIssuer([issuer.account.address]);
      await expectRevert(asIssuer.write.registerCredential([docHash("x"), "Course"]), "IssuerNotAuthorized");
      expect(await registry.read.credentialCount()).to.equal(0n);
    });

    it("rejects a duplicate document fingerprint", async () => {
      const { asIssuer } = await loadFixture(deployWithIssuer);
      await asIssuer.write.registerCredential([docHash("same"), "Course"]);
      await expectRevert(asIssuer.write.registerCredential([docHash("same"), "Project"]), "DuplicateDocumentHash");
    });

    it("rejects a zero hash and unsupported types", async () => {
      const { asIssuer } = await loadFixture(deployWithIssuer);
      await expectRevert(asIssuer.write.registerCredential([zeroHash, "Course"]), "InvalidDocumentHash");
      await expectRevert(asIssuer.write.registerCredential([docHash("a"), "course"]), "InvalidCredentialType");
      await expectRevert(asIssuer.write.registerCredential([docHash("a"), ""]), "InvalidCredentialType");
    });
  });

  describe("verification", () => {
    it("verifies the right hash and fails the wrong one", async () => {
      const { registry, asIssuer, issuer } = await loadFixture(deployWithIssuer);
      await asIssuer.write.registerCredential([docHash("original"), "Internship"]);
      const [exists, matches, revoked, who] = await registry.read.verifyCredential([1n, docHash("original")]);
      expect([exists, matches, revoked]).to.deep.equal([true, true, false]);
      expect(who).to.equal(getAddress(issuer.account.address));
      const [, wrong] = await registry.read.verifyCredential([1n, docHash("tampered")]);
      expect(wrong).to.equal(false);
    });

    it("handles unknown and invalid IDs", async () => {
      const { registry } = await loadFixture(deployWithIssuer);
      const [exists, matches] = await registry.read.verifyCredential([42n, docHash("x")]);
      expect([exists, matches]).to.deep.equal([false, false]);
      const [zeroExists] = await registry.read.verifyCredential([0n, docHash("x")]);
      expect(zeroExists).to.equal(false);
      await expectRevert(registry.read.getCredential([42n]), "CredentialNotFound");
      await expectRevert(registry.read.getCredential([0n]), "CredentialNotFound");
    });
  });

  describe("revocation", () => {
    it("lets the issuing issuer revoke, once", async () => {
      const { registry, asIssuer } = await loadFixture(deployWithIssuer);
      await asIssuer.write.registerCredential([docHash("r"), "Achievement"]);
      await asIssuer.write.revokeCredential([1n]);
      expect((await registry.read.getCredential([1n])).revoked).to.equal(true);
      const [, matches, revoked] = await registry.read.verifyCredential([1n, docHash("r")]);
      expect([matches, revoked]).to.deep.equal([true, true]);
      expect(await registry.getEvents.CredentialRevoked({ credentialId: 1n })).to.have.lengthOf(1);
      await expectRevert(asIssuer.write.revokeCredential([1n]), "CredentialAlreadyRevoked");
    });

    it("blocks outsiders, other issuers and unknown IDs", async () => {
      const { registry, asIssuer, asOutsider, asIssuer2, issuer2 } = await loadFixture(deployWithIssuer);
      await asIssuer.write.registerCredential([docHash("r2"), "Other"]);
      await expectRevert(asOutsider.write.revokeCredential([1n]), "IssuerNotAuthorized");
      await registry.write.authorizeIssuer([issuer2.account.address]);
      await expectRevert(asIssuer2.write.revokeCredential([1n]), "NotCredentialIssuer");
      await expectRevert(asIssuer.write.revokeCredential([9n]), "CredentialNotFound");
      expect((await registry.read.getCredential([1n])).revoked).to.equal(false);
    });
  });
});
