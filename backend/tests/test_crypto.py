import pytest
import os
from backend.app.crypto.cipher import (
    encrypt_payload,
    decrypt_payload,
    derive_key,
    InvalidMagicError,
    TamperedOrWrongPasswordError,
    CryptoError
)
from backend.app.crypto.integrity import compute_sha256, verify_sha256, compute_hashes
from backend.app.crypto.archive import create_secure_zip, extract_secure_zip, ArchiveSecurityError
from backend.app.config import MAGIC_HEADER


def test_derive_key_consistency():
    salt = os.urandom(16)
    password = "SuperSecretPassword123!"
    key1 = derive_key(password, salt)
    key2 = derive_key(password, salt)
    assert key1 == key2
    assert len(key1) == 32

    # Different salt must produce different key
    diff_salt = os.urandom(16)
    key3 = derive_key(password, diff_salt)
    assert key1 != key3


def test_encryption_roundtrip_text():
    sample_data = b"Cybersecurity top secret intelligence payload."
    password = "CorrectHorseBatteryStaple#2026"
    filename = "intelligence.txt"

    encrypted = encrypt_payload(sample_data, password, filename, "text/plain")
    assert encrypted.startswith(MAGIC_HEADER)
    assert len(encrypted) > len(sample_data) + 32  # Header + salt + nonce + tag

    metadata, decrypted = decrypt_payload(encrypted, password)
    assert decrypted == sample_data
    assert metadata["filename"] == filename
    assert metadata["content_type"] == "text/plain"
    assert metadata["sha256"] == compute_sha256(sample_data)


def test_encryption_roundtrip_binary_pdf():
    # Simulated PDF binary data
    pdf_bytes = b"%PDF-1.7\n" + os.urandom(1024) + b"\n%%EOF"
    password = "VaultMasterKey999$"

    encrypted = encrypt_payload(pdf_bytes, password, "confidential.pdf", "application/pdf")
    metadata, decrypted = decrypt_payload(encrypted, password)

    assert decrypted == pdf_bytes
    assert metadata["filename"] == "confidential.pdf"
    assert metadata["size"] == len(pdf_bytes)


def test_wrong_password_fails_authentication():
    sample_data = b"Data to protect against unauthorized decryption."
    correct_pass = "AccurateKey777!"
    wrong_pass = "InaccurateKey777!"

    encrypted = encrypt_payload(sample_data, correct_pass, "doc.txt")
    with pytest.raises(TamperedOrWrongPasswordError):
        decrypt_payload(encrypted, wrong_pass)


def test_tampered_ciphertext_fails_authentication():
    sample_data = b"Tamper detection verification byte stream."
    password = "SecurePassword#456"

    encrypted = bytearray(encrypt_payload(sample_data, password, "test.txt"))
    # Flip one bit in the middle of ciphertext
    encrypted[45] ^= 0x01

    with pytest.raises(TamperedOrWrongPasswordError):
        decrypt_payload(bytes(encrypted), password)


def test_invalid_magic_header():
    sample_data = b"Testing magic header validation."
    password = "AnyValidPassword123"

    encrypted = bytearray(encrypt_payload(sample_data, password, "test.txt"))
    # Corrupt the magic header b"SVX1"
    encrypted[0] = ord(b"X")

    with pytest.raises(InvalidMagicError):
        decrypt_payload(bytes(encrypted), password)


def test_sha256_integrity_verification():
    data = b"Cryptographic integrity check test vector."
    sha256_hash = compute_sha256(data)
    assert len(sha256_hash) == 64

    # Matches
    assert verify_sha256(data, sha256_hash) is True
    assert verify_sha256(data, sha256_hash.upper()) is True

    # Modified data must fail
    modified_data = b"Cryptographic integrity check test vector!"
    assert verify_sha256(modified_data, sha256_hash) is False

    # Multi hash output
    hashes = compute_hashes(data)
    assert "sha256" in hashes
    assert "sha512" in hashes
    assert "md5" in hashes


def test_archive_bundling_and_zip_slip_defense():
    files = [
        ("report.txt", b"Annual Report Content"),
        ("notes.md", b"# Security Notes\nAll clear.")
    ]
    zip_bytes = create_secure_zip(files)
    extracted = extract_secure_zip(zip_bytes)

    assert len(extracted) == 2
    filenames = {name for name, _ in extracted}
    assert "report.txt" in filenames
    assert "notes.md" in filenames

    # Test zip slip attempt
    malicious_files = [("../../../evil.sh", b"malicious code")]
    zip_bytes_slip = create_secure_zip(malicious_files)
    # create_secure_zip normalizes path so ../../../evil.sh becomes evil.sh
    extracted_clean = extract_secure_zip(zip_bytes_slip)
    assert extracted_clean[0][0] == "evil.sh"
