from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from ..config import MAX_FILE_SIZE_BYTES
from ..crypto.cipher import encrypt_payload
from ..crypto.archive import create_secure_zip, ArchiveSecurityError
from ..crypto.integrity import compute_sha256
from ..models.database import get_db, AuditRecord
from ..utils.security import sanitize_filename, hash_client_ip, log_security_event

router = APIRouter(prefix="/api/encrypt", tags=["Encryption"])


@router.post("/file")
async def encrypt_single_file(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(..., min_length=4),
    db: Session = Depends(get_db)
):
    """
    Encrypts a single file using AES-256-GCM authenticated encryption and Scrypt KDF.
    Returns the encrypted .svx container as a downloadable file.
    Zero plaintext, passwords, or keys are persisted or logged.
    """
    clean_filename = sanitize_filename(file.filename)
    ip_hash = hash_client_ip(request)

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Cannot encrypt an empty file.")
        
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail=f"File exceeds maximum allowed size ({MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB).")

        raw_sha256 = compute_sha256(content)

        # Authenticated encryption
        encrypted_container = encrypt_payload(
            file_bytes=content,
            password=password,
            filename=clean_filename,
            content_type=file.content_type or "application/octet-stream",
            is_archive=False
        )

        # Audit success (No sensitive data)
        audit = AuditRecord(
            action="ENCRYPT",
            filename=clean_filename,
            file_size=len(content),
            status="SUCCESS",
            details="AES-256-GCM authenticated container created",
            client_ip_hash=ip_hash,
            sha256_hash=raw_sha256
        )
        db.add(audit)
        db.commit()

        log_security_event("FILE_ENCRYPTED", f"File: {clean_filename}, Size: {len(content)}B")

        # Response filename
        out_filename = f"{clean_filename}.svx"

        return Response(
            content=encrypted_container,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
                "X-Encrypted-Size": str(len(encrypted_container)),
                "X-Original-SHA256": raw_sha256
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        audit = AuditRecord(
            action="ENCRYPT",
            filename=clean_filename,
            file_size=0,
            status="FAILED",
            details=f"Encryption error: {type(e).__name__}",
            client_ip_hash=ip_hash
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=500, detail="An error occurred during file encryption.")


@router.post("/archive")
async def encrypt_multiple_files(
    request: Request,
    files: List[UploadFile] = File(...),
    password: str = Form(..., min_length=4),
    archive_name: Optional[str] = Form("secure_vault_archive"),
    db: Session = Depends(get_db)
):
    """
    Encrypts multiple files into a single secure AES-256-GCM authenticated archive (.svxa).
    Applies zip-slip defense and safe packaging before encryption.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided for archive encryption.")

    clean_archive_name = sanitize_filename(archive_name)
    if not clean_archive_name.endswith(".zip"):
        clean_archive_name = f"{clean_archive_name}.zip"

    ip_hash = hash_client_ip(request)
    file_tuples = []
    total_size = 0

    try:
        for f in files:
            name = sanitize_filename(f.filename)
            data = await f.read()
            total_size += len(data)
            if total_size > MAX_FILE_SIZE_BYTES * 2:
                raise HTTPException(status_code=413, detail="Total archive payload exceeds size limit.")
            file_tuples.append((name, data))

        # Bundle files into safe zip archive
        zip_bytes = create_secure_zip(file_tuples)
        raw_sha256 = compute_sha256(zip_bytes)

        # Encrypt the bundled archive
        encrypted_container = encrypt_payload(
            file_bytes=zip_bytes,
            password=password,
            filename=clean_archive_name,
            content_type="application/zip",
            is_archive=True
        )

        # Audit success
        audit = AuditRecord(
            action="ENCRYPT_ARCHIVE",
            filename=clean_archive_name,
            file_size=len(zip_bytes),
            status="SUCCESS",
            details=f"Secure archive created with {len(files)} files",
            client_ip_hash=ip_hash,
            sha256_hash=raw_sha256
        )
        db.add(audit)
        db.commit()

        log_security_event("ARCHIVE_ENCRYPTED", f"Archive: {clean_archive_name}, Member count: {len(files)}")

        out_filename = f"{clean_archive_name}.svxa"

        return Response(
            content=encrypted_container,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
                "X-Encrypted-Size": str(len(encrypted_container)),
                "X-Original-SHA256": raw_sha256,
                "X-Member-Count": str(len(files))
            }
        )

    except ArchiveSecurityError as ase:
        raise HTTPException(status_code=400, detail=str(ase))
    except HTTPException:
        raise
    except Exception as e:
        audit = AuditRecord(
            action="ENCRYPT_ARCHIVE",
            filename=clean_archive_name,
            file_size=0,
            status="FAILED",
            details=f"Archive encryption error: {type(e).__name__}",
            client_ip_hash=ip_hash
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to create encrypted archive.")
