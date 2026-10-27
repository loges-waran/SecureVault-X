import hashlib
import hmac
from typing import Dict, BinaryIO, Union

def compute_sha256(data: Union[bytes, BinaryIO]) -> str:
    """
    Computes standard SHA-256 hex digest using streaming chunks if a file-like object is given.
    """
    hasher = hashlib.sha256()
    if isinstance(data, (bytes, bytearray)):
        hasher.update(data)
    else:
        while chunk := data.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest().lower()

def compute_hashes(data: bytes) -> Dict[str, str]:
    """
    Computes cryptographic and legacy hashes for integrity verification dashboard:
    - SHA-256 (Primary cryptographic integrity)
    - SHA-512 (High security)
    - SHA-1 (Legacy reference)
    - MD5 (Legacy reference)
    """
    return {
        "sha256": hashlib.sha256(data).hexdigest().lower(),
        "sha512": hashlib.sha512(data).hexdigest().lower(),
        "sha1": hashlib.sha1(data).hexdigest().lower(),
        "md5": hashlib.md5(data).hexdigest().lower()
    }

def verify_sha256(data: Union[bytes, BinaryIO], expected_hash: str) -> bool:
    """
    Verifies data against an expected SHA-256 hash using constant-time comparison
    to prevent timing analysis.
    """
    actual_hash = compute_sha256(data)
    cleaned_expected = expected_hash.strip().lower()
    return hmac.compare_digest(actual_hash, cleaned_expected)
