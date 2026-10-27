from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from ..config import MAX_FILE_SIZE_BYTES
from ..crypto.cipher import (
    decrypt_payload,
    InvalidMagicError,
    TamperedOrWrongPasswordError,
    IntegrityError,
    CryptoError
)
from ..crypto.archive import extract_secure_zip, ArchiveSecurityError
from ..models.database import get_db, AuditRecord
from ..utils.security import sanitize_filename, hash_client_ip, log_security_event

router = APIRouter(prefix="/api/decrypt", tags=["Decryption"])


@router.post("/file")
async def decrypt_file(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Authenticates and decrypts a SecureVault X container (.svx / .svxa).
    Detects wrong passwords, invalid file headers, and tampered ciphertext.
    Verifies SHA-256 integrity before releasing decrypted content.
    """
    clean_upload_name = sanitize_filename(file.filename)
    ip_hash = hash_client_ip(request)

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Cannot decrypt an empty file.")

        if len(content) > MAX_FILE_SIZE_BYTES * 2:
            raise HTTPException(status_code=413, detail="Encrypted container exceeds size limit.")

        # Authenticate and decrypt
        metadata, decrypted_bytes = decrypt_payload(content, password)

        original_filename = sanitize_filename(metadata.get("filename", "decrypted_file"))
        content_type = metadata.get("content_type", "application/octet-stream")
        sha256_hash = metadata.get("sha256", "")
        is_archive = metadata.get("is_archive", False)

        # Audit successful decryption
        audit = AuditRecord(
            action="DECRYPT",
            filename=original_filename,
            file_size=len(decrypted_bytes),
            status="SUCCESS",
            details="Authentication tag and SHA-256 verified successfully",
            client_ip_hash=ip_hash,
            sha256_hash=sha256_hash
        )
        db.add(audit)
        db.commit()

        log_security_event("FILE_DECRYPTED", f"Decrypted: {original_filename}, Size: {len(decrypted_bytes)}B")

        # Encode filename safely in headers
        from urllib.parse import quote
        encoded_filename = quote(original_filename)

        return Response(
            content=decrypted_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{original_filename}"; filename*=UTF-8\'\'{encoded_filename}',
                "X-Original-Filename": original_filename,
                "X-Decrypted-SHA256": sha256_hash,
                "X-Is-Archive": str(is_archive).lower(),
                "Access-Control-Expose-Headers": "Content-Disposition, X-Original-Filename, X-Decrypted-SHA256, X-Is-Archive"
            }
        )

    except InvalidMagicError as ime:
        audit = AuditRecord(
            action="DECRYPT",
            filename=clean_upload_name,
            file_size=len(content) if 'content' in locals() else 0,
            status="FAILED",
            details="Invalid container header (not a .svx file)",
            client_ip_hash=ip_hash
        )
        db.add(audit)
        db.commit()
        log_security_event("DECRYPT_INVALID_HEADER", f"File: {clean_upload_name}")
        raise HTTPException(
            status_code=400,
            detail="Invalid file format: This file is not a valid SecureVault X (.svx) encrypted container."
        )

    except TamperedOrWrongPasswordError:
        audit = AuditRecord(
            action="DECRYPT",
            filename=clean_upload_name,
            file_size=len(content) if 'content' in locals() else 0,
            status="FAILED",
            details="Authentication failure: incorrect password or tampered ciphertext/tag",
            client_ip_hash=ip_hash
        )
        db.add(audit)
        db.commit()
        log_security_event("DECRYPT_AUTH_FAILED", f"File: {clean_upload_name}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed: Incorrect password or the encrypted file has been tampered with or corrupted."
        )

    except IntegrityError as ie:
        audit = AuditRecord(
            action="DECRYPT",
            filename=clean_upload_name,
            file_size=len(content) if 'content' in locals() else 0,
            status="FAILED",
            details="Integrity mismatch after decryption",
            client_ip_hash=ip_hash
        )
        db.add(audit)
        db.commit()
        log_security_event("DECRYPT_INTEGRITY_MISMATCH", f"File: {clean_upload_name}")
        raise HTTPException(
            status_code=422,
            detail=str(ie)
        )

    except CryptoError as ce:
        audit = AuditRecord(
            action="DECRYPT",
            filename=clean_upload_name,
            file_size=len(content) if 'content' in locals() else 0,
            status="FAILED",
            details=f"Crypto error: {str(ce)}",
            client_ip_hash=ip_hash
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=400, detail=str(ce))

    except HTTPException:
        raise
    except Exception as e:
        audit = AuditRecord(
            action="DECRYPT",
            filename=clean_upload_name,
            file_size=0,
            status="FAILED",
            details=f"Unexpected error: {type(e).__name__}",
            client_ip_hash=ip_hash
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=500, detail="An error occurred while decrypting the file.")
