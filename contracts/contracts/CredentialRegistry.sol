// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofMesh CredentialRegistry (Ethereum Sepolia testnet)
/// @notice Stores only a document fingerprint (SHA-256 as bytes32) and minimal metadata.
///         Documents and personal data never go on-chain. A registration proves that a given
///         fingerprint was submitted by an authorized issuer wallet under these rules — it does
///         not prove the document's claims are true.
/// @dev Credential IDs are sequential integers 1..999999, displayed off-chain as "PM-" + 6 digits
///      (e.g. 1 => PM-000001). This mapping is deterministic across frontend, database and chain.
contract CredentialRegistry {
    struct Credential {
        bytes32 documentHash;
        address issuer;
        uint256 issuedAt;
        bool revoked;
        string credentialType;
    }

    uint256 public constant MAX_CREDENTIAL_ID = 999_999;

    address public immutable owner;
    uint256 public credentialCount;

    mapping(uint256 => Credential) private _credentials;
    mapping(address => bool) private _authorizedIssuers;
    /// @notice Fingerprint => credential ID (0 when unregistered). Prevents registering one document twice.
    mapping(bytes32 => uint256) public credentialIdByHash;

    error NotOwner();
    error InvalidAddress();
    error IssuerAlreadyAuthorized(address issuer);
    error IssuerNotAuthorized(address issuer);
    error InvalidDocumentHash();
    error InvalidCredentialType();
    error DuplicateDocumentHash(uint256 existingCredentialId);
    error CredentialNotFound(uint256 credentialId);
    error CredentialAlreadyRevoked(uint256 credentialId);
    error NotCredentialIssuer(uint256 credentialId, address caller);
    error RegistryFull();

    event IssuerAuthorized(address indexed issuer, address indexed authorizedBy);
    event IssuerAuthorizationRemoved(address indexed issuer, address indexed removedBy);
    event CredentialRegistered(
        uint256 indexed credentialId,
        address indexed issuer,
        bytes32 indexed documentHash,
        string credentialType,
        uint256 issuedAt
    );
    event CredentialRevoked(uint256 indexed credentialId, address indexed issuer, uint256 revokedAt);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAuthorizedIssuer() {
        if (!_authorizedIssuers[msg.sender]) revert IssuerNotAuthorized(msg.sender);
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ---------------------------------------------------------------- issuers

    function authorizeIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert InvalidAddress();
        if (_authorizedIssuers[issuer]) revert IssuerAlreadyAuthorized(issuer);
        _authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer, msg.sender);
    }

    function removeAuthorizedIssuer(address issuer) external onlyOwner {
        if (!_authorizedIssuers[issuer]) revert IssuerNotAuthorized(issuer);
        _authorizedIssuers[issuer] = false;
        emit IssuerAuthorizationRemoved(issuer, msg.sender);
    }

    function isAuthorizedIssuer(address issuer) external view returns (bool) {
        return _authorizedIssuers[issuer];
    }

    // ------------------------------------------------------------ credentials

    /// @param documentHash SHA-256 digest of the exact document bytes, as bytes32 (0x + 64 hex).
    /// @param credentialType One of: Academic, Internship, Course, Achievement, Project, Other.
    /// @return credentialId Sequential ID (display as PM-000001).
    function registerCredential(bytes32 documentHash, string calldata credentialType)
        external
        onlyAuthorizedIssuer
        returns (uint256 credentialId)
    {
        if (documentHash == bytes32(0)) revert InvalidDocumentHash();
        if (!_isValidType(credentialType)) revert InvalidCredentialType();
        uint256 existing = credentialIdByHash[documentHash];
        if (existing != 0) revert DuplicateDocumentHash(existing);
        if (credentialCount >= MAX_CREDENTIAL_ID) revert RegistryFull();

        credentialId = ++credentialCount;
        _credentials[credentialId] = Credential({
            documentHash: documentHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false,
            credentialType: credentialType
        });
        credentialIdByHash[documentHash] = credentialId;

        emit CredentialRegistered(credentialId, msg.sender, documentHash, credentialType, block.timestamp);
    }

    function getCredential(uint256 credentialId) external view returns (Credential memory) {
        if (!_exists(credentialId)) revert CredentialNotFound(credentialId);
        return _credentials[credentialId];
    }

    /// @notice Never reverts for unknown IDs so verifiers get a clear answer.
    /// @return exists Whether the ID is registered.
    /// @return hashMatches Whether `documentHash` equals the registered fingerprint.
    /// @return revoked Whether the issuer has revoked the credential.
    /// @return issuer The registering issuer wallet (zero if unknown).
    function verifyCredential(uint256 credentialId, bytes32 documentHash)
        external
        view
        returns (bool exists, bool hashMatches, bool revoked, address issuer)
    {
        if (!_exists(credentialId)) return (false, false, false, address(0));
        Credential storage c = _credentials[credentialId];
        return (true, c.documentHash == documentHash, c.revoked, c.issuer);
    }

    /// @notice Only the original issuer, while still authorized, can revoke. Revocation is final.
    function revokeCredential(uint256 credentialId) external onlyAuthorizedIssuer {
        if (!_exists(credentialId)) revert CredentialNotFound(credentialId);
        Credential storage c = _credentials[credentialId];
        if (c.issuer != msg.sender) revert NotCredentialIssuer(credentialId, msg.sender);
        if (c.revoked) revert CredentialAlreadyRevoked(credentialId);
        c.revoked = true;
        emit CredentialRevoked(credentialId, msg.sender, block.timestamp);
    }

    // --------------------------------------------------------------- internal

    function _exists(uint256 credentialId) private view returns (bool) {
        return credentialId != 0 && credentialId <= credentialCount;
    }

    function _isValidType(string calldata t) private pure returns (bool) {
        bytes32 h = keccak256(bytes(t));
        return h == keccak256("Academic") || h == keccak256("Internship") || h == keccak256("Course")
            || h == keccak256("Achievement") || h == keccak256("Project") || h == keccak256("Other");
    }
}
