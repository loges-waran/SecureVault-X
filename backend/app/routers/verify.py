from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional

from ..config import MAX_FILE_SIZE_BYTES
from ..crypto.integrity import compute_hashes, verify_sha256, compute_sha256
from ..models.database import get_db, AuditRecord
from ..models.schemas import IntegrityCheckResponse
from ..utils.security import sanitize_filename, hash_client_ip, log_security_event

router = APIRouter(prefix="/api/verify", tags=["Integrity Verification"])


@router.post("/hash", response_model=IntegrityCheckResponse)
async def check_file_integrity(
    request: Request,
    file: UploadFile = File(...),
    expected_sha256: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Computes cryptographic hashes (SHA-256, SHA-512, etc.) for any file.
    If an expected SHA-256 is supplied, performs constant-time integrity verification.
    """
    clean_filename = sanitize_filename(file.filename)
    ip_hash = hash_client_ip(request)

    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE_BYTES * 2:
            raise HTTPException(status_code=413, detail="File exceeds maximum allowable size.")

        hashes = compute_hashes(content)
        actual_sha256 = hashes["sha256"]

        matches = None
        message = "Cryptographic checksums generated successfully."

        if expected_sha256 and expected_sha256.strip():
            clean_expected = expected_sha256.strip().lower()
            matches = verify_sha256(content, clean_expected)
            if matches:
                message = "INTEGRITY VERIFIED: SHA-256 checksum exactly matches the expected hash."
            else:
                message = "INTEGRITY ALERT: SHA-256 checksum does NOT match! The file has been modified or corrupted."

        # Audit record
        audit = AuditRecord(
            action="VERIFY",
            filename=clean_filename,
            file_size=len(content),
            status="SUCCESS" if matches is not False else "FAILED",
            details=message,
            client_ip_hash=ip_hash,
            sha256_hash=actual_sha256
        )
        db.add(audit)
        db.commit()

        log_security_event("INTEGRITY_CHECK", f"File: {clean_filename}, Matches: {matches}")

        return IntegrityCheckResponse(
            filename=clean_filename,
            file_size=len(content),
            hashes=hashes,
            matches_expected=matches,
            expected_sha256=expected_sha256.strip() if expected_sha256 else None,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute file integrity: {str(e)}")


@router.post("/tamper-demo")
async def tamper_demonstration(
    file: UploadFile = File(...),
    byte_index: Optional[int] = Form(0)
):
    """
    Cybersecurity test endpoint: Flips a single bit in the file to demonstrably prove
    how cryptographic integrity and AES-GCM authentication detect single-bit corruption.
    """
    content = bytearray(await file.read())
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Cannot tamper with an empty file.")

    idx = min(max(0, byte_index or 0), len(content) - 1)
    original_sha256 = compute_sha256(bytes(content))

    # Flip the lowest bit of the selected byte
    content[idx] ^= 0x01
    tampered_bytes = bytes(content)
    tampered_sha256 = compute_sha256(tampered_bytes)

    return {
        "status": "tampered",
        "file_size": len(tampered_bytes),
        "flipped_byte_index": idx,
        "original_sha256": original_sha256,
        "tampered_sha256": tampered_sha256,
        "hashes_differ": original_sha256 != tampered_sha256,
        "explanation": "Even a 1-bit modification fundamentally alters the SHA-256 avalanche effect and causes AES-GCM authentication tag verification to fail."
    }
