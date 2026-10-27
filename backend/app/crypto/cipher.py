import json
import os
import struct
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.exceptions import InvalidTag

from ..config import MAGIC_HEADER, SALT_SIZE, NONCE_SIZE, KEY_SIZE, SCRYPT_N, SCRYPT_R, SCRYPT_P
from .integrity import compute_sha256

class CryptoError(Exception):
    """Base exception for cryptographic operations in SecureVault X."""
    pass

class InvalidMagicError(CryptoError):
    """Raised when the file header does not match the SecureVault X container specification."""
    pass

class TamperedOrWrongPasswordError(CryptoError):
    """Raised when authentication tag verification fails (either wrong password or tampered ciphertext)."""
    pass

class IntegrityError(CryptoError):
    """Raised when reconstructed plaintext SHA-256 does not match original manifest hash."""
    pass


def derive_key(password: str, salt: bytes) -> bytes:
    """
    Derives a 256-bit (32 bytes) symmetric key from a password and cryptographically
    secure random salt using Scrypt.
    """
    if not isinstance(password, str) or not password:
        raise CryptoError("Password must be a non-empty string.")
    
    password_bytes = password.encode("utf-8")
    kdf = Scrypt(
        salt=salt,
        length=KEY_SIZE,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
    )
    return kdf.derive(password_bytes)


def encrypt_payload(
    file_bytes: bytes,
    password: str,
    filename: str,
    content_type: str = "application/octet-stream",
    is_archive: bool = False
) -> bytes:
    """
    Encrypts a file's content and metadata using AES-256-GCM authenticated encryption.
    Generates a secure random salt (16 bytes) and nonce (12 bytes).
    Embeds metadata and original SHA-256 inside the authenticated envelope.
    """
    # 1. Generate cryptographically secure random salt and nonce
    salt = os.urandom(SALT_SIZE)
    nonce = os.urandom(NONCE_SIZE)

    # 2. Derive 256-bit key using Scrypt KDF
    key = derive_key(password, salt)

    # 3. Calculate original plaintext integrity hash
    original_sha256 = compute_sha256(file_bytes)

    # 4. Prepare inner metadata header
    metadata: Dict[str, Any] = {
        "filename": filename,
        "content_type": content_type or "application/octet-stream",
        "sha256": original_sha256,
        "size": len(file_bytes),
        "is_archive": is_archive,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    metadata_json_bytes = json.dumps(metadata).encode("utf-8")
    header_len_bytes = struct.pack(">I", len(metadata_json_bytes))

    # Inner plaintext: [4 bytes header len][JSON metadata][file content]
    inner_payload = header_len_bytes + metadata_json_bytes + file_bytes

    # 5. Authenticated encryption using AES-256-GCM
    # MAGIC_HEADER is used as Associated Authenticated Data (AAD)
    aesgcm = AESGCM(key)
    ciphertext_and_tag = aesgcm.encrypt(nonce, inner_payload, associated_data=MAGIC_HEADER)

    # 6. Container output:
    # [4 bytes MAGIC_HEADER (b'SVX1')] + [16 bytes SALT] + [12 bytes NONCE] + [CIPHERTEXT + 16 bytes TAG]
    container = MAGIC_HEADER + salt + nonce + ciphertext_and_tag
    return container


def decrypt_payload(
    container_bytes: bytes,
    password: str
) -> Tuple[Dict[str, Any], bytes]:
    """
    Decrypts and authenticates a SecureVault X container (.svx).
    Validates magic header, derives key using Scrypt, verifies GCM authentication tag,
    and checks plaintext SHA-256 integrity.
    
    Returns:
        Tuple of (metadata_dict, decrypted_file_bytes)
    """
    min_required_len = len(MAGIC_HEADER) + SALT_SIZE + NONCE_SIZE + 16 + 4
    if len(container_bytes) < min_required_len:
        raise CryptoError("File is too small or truncated to be a valid SecureVault X container.")

    # 1. Validate magic header
    magic = container_bytes[:len(MAGIC_HEADER)]
    if magic != MAGIC_HEADER:
        raise InvalidMagicError("Invalid container header. File is not a valid SecureVault X (.svx) file.")

    offset = len(MAGIC_HEADER)
    salt = container_bytes[offset:offset + SALT_SIZE]
    offset += SALT_SIZE

    nonce = container_bytes[offset:offset + NONCE_SIZE]
    offset += NONCE_SIZE

    ciphertext_and_tag = container_bytes[offset:]

    # 2. Derive key from password + extracted salt
    key = derive_key(password, salt)

    # 3. Decrypt and verify AES-GCM tag
    aesgcm = AESGCM(key)
    try:
        inner_payload = aesgcm.decrypt(nonce, ciphertext_and_tag, associated_data=MAGIC_HEADER)
    except InvalidTag:
        raise TamperedOrWrongPasswordError(
            "Authentication failed: Incorrect password or corrupted/tampered file."
        )

    # 4. Unpack inner header
    if len(inner_payload) < 4:
        raise CryptoError("Malformed payload inside authenticated container.")

    header_len = struct.unpack(">I", inner_payload[:4])[0]
    if len(inner_payload) < 4 + header_len:
        raise CryptoError("Corrupted metadata header inside authenticated container.")

    metadata_bytes = inner_payload[4:4 + header_len]
    file_bytes = inner_payload[4 + header_len:]

    try:
        metadata = json.loads(metadata_bytes.decode("utf-8"))
    except Exception as e:
        raise CryptoError(f"Failed to decode container metadata: {str(e)}")

    # 5. Verify integrity against original SHA-256
    expected_sha256 = metadata.get("sha256")
    actual_sha256 = compute_sha256(file_bytes)
    if expected_sha256 and expected_sha256.lower() != actual_sha256.lower():
        raise IntegrityError(
            f"Integrity check failed: Reconstructed SHA-256 ({actual_sha256}) "
            f"does not match original manifest hash ({expected_sha256})."
        )

    return metadata, file_bytes
