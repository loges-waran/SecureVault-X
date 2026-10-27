import os
import secrets
from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from ..config import STORAGE_DIR, MAX_FILE_SIZE_BYTES
from ..crypto.cipher import encrypt_payload
from ..models.database import get_db, SharedFile, AuditRecord
from ..models.schemas import ShareInfoResponse
from ..utils.security import sanitize_filename, hash_client_ip, log_security_event

router = APIRouter(prefix="/api/share", tags=["Secure Sharing"])


@router.post("/create")
async def create_secure_share(
    request: Request,
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    is_already_encrypted: bool = Form(False),
    expiry_hours: int = Form(24),
    max_downloads: int = Form(1),
    db: Session = Depends(get_db)
):
    """
    Creates a secure, access-controlled ephemeral share.
    - If file is already a .svx container, stores it directly.
    - If file is unencrypted, encrypts it on-the-fly with the user-provided password.
    - Passwords and keys are NEVER persisted.
    - Only the encrypted ciphertext is stored on disk.
    - Auto-revocation based on max downloads (burn after reading) or expiration time.
    """
    if expiry_hours < 1 or expiry_hours > 168:
        raise HTTPException(status_code=400, detail="Expiry hours must be between 1 and 168.")
    if max_downloads < 1 or max_downloads > 50:
        raise HTTPException(status_code=400, detail="Max downloads must be between 1 and 50.")

    clean_filename = sanitize_filename(file.filename)
    ip_hash = hash_client_ip(request)

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Cannot share an empty file.")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds sharing limit.")

    # Determine encrypted payload
    if is_already_encrypted or clean_filename.endswith(".svx") or clean_filename.endswith(".svxa"):
        encrypted_bytes = content
    else:
        if not password or len(password) < 4:
            raise HTTPException(status_code=400, detail="A strong password is required to encrypt the shared file.")
        encrypted_bytes = encrypt_payload(
            file_bytes=content,
            password=password,
            filename=clean_filename,
            content_type=file.content_type or "application/octet-stream"
        )
        if not clean_filename.endswith(".svx"):
            clean_filename = f"{clean_filename}.svx"

    # Generate cryptographically secure share token
    share_id = secrets.token_urlsafe(32)
    storage_path = os.path.join(STORAGE_DIR, f"{share_id}.svx")

    with open(storage_path, "wb") as f:
        f.write(encrypted_bytes)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=expiry_hours)

    shared_entry = SharedFile(
        share_id=share_id,
        original_filename=clean_filename,
        storage_path=storage_path,
        file_size=len(encrypted_bytes),
        content_type="application/octet-stream",
        created_at=now,
        expires_at=expires_at,
        max_downloads=max_downloads,
        download_count=0,
        is_active=True
    )
    db.add(shared_entry)

    # Audit log (no passwords or keys)
    audit = AuditRecord(
        action="SHARE_CREATE",
        filename=clean_filename,
        file_size=len(encrypted_bytes),
        status="SUCCESS",
        details=f"Share created: id={share_id[:8]}..., max_downloads={max_downloads}, expiry={expiry_hours}h",
        client_ip_hash=ip_hash
    )
    db.add(audit)
    db.commit()

    log_security_event("SHARE_CREATED", f"Share ID: {share_id[:8]}... for {clean_filename}")

    return {
        "share_id": share_id,
        "filename": clean_filename,
        "file_size": len(encrypted_bytes),
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "max_downloads": max_downloads,
        "downloads_remaining": max_downloads,
        "message": "Secure share created. The server stores only the encrypted container. Passwords are never saved."
    }


@router.get("/{share_id}/info", response_model=ShareInfoResponse)
async def get_share_info(share_id: str, db: Session = Depends(get_db)):
    """
    Retrieves public metadata for a share without exposing file content.
    Checks expiration and download quota.
    """
    entry = db.query(SharedFile).filter(SharedFile.share_id == share_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Secure share not found.")
    if not entry.is_active:
        raise HTTPException(status_code=410, detail="This secure share has expired or reached its download limit.")

    now = datetime.now(timezone.utc)
    entry_expires = entry.expires_at.replace(tzinfo=timezone.utc) if entry.expires_at.tzinfo is None else entry.expires_at

    is_expired = now > entry_expires
    downloads_remaining = max(0, entry.max_downloads - entry.download_count)

    if is_expired or downloads_remaining <= 0:
        entry.is_active = False
        db.commit()
        # Wipe file
        if os.path.exists(entry.storage_path):
            try:
                os.remove(entry.storage_path)
            except Exception:
                pass
        raise HTTPException(status_code=410, detail="This secure share has expired or reached its download limit.")

    return ShareInfoResponse(
        share_id=entry.share_id,
        original_filename=entry.original_filename,
        file_size=entry.file_size,
        created_at=entry.created_at,
        expires_at=entry.expires_at,
        downloads_remaining=downloads_remaining,
        is_active=entry.is_active,
        is_expired=is_expired
    )


@router.get("/{share_id}/download")
async def download_shared_file(
    share_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Downloads the encrypted container. Increments download counter.
    If maximum downloads reached or burn-after-reading triggered, securely removes
    the file from disk.
    """
    ip_hash = hash_client_ip(request)
    entry = db.query(SharedFile).filter(SharedFile.share_id == share_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Share not found.")
    if not entry.is_active:
        raise HTTPException(status_code=410, detail="This share link has expired or reached download limits.")

    now = datetime.now(timezone.utc)
    entry_expires = entry.expires_at.replace(tzinfo=timezone.utc) if entry.expires_at.tzinfo is None else entry.expires_at

    if now > entry_expires or entry.download_count >= entry.max_downloads:
        entry.is_active = False
        db.commit()
        if os.path.exists(entry.storage_path):
            try:
                os.remove(entry.storage_path)
            except Exception:
                pass
        raise HTTPException(status_code=410, detail="This share link has expired or reached download limits.")

    if not os.path.exists(entry.storage_path):
        raise HTTPException(status_code=404, detail="Encrypted file payload missing from storage.")

    with open(entry.storage_path, "rb") as f:
        encrypted_data = f.read()

    # Update download count
    entry.download_count += 1
    if entry.download_count >= entry.max_downloads:
        entry.is_active = False
        # Burn after reading: secure removal
        try:
            os.remove(entry.storage_path)
        except Exception:
            pass

    # Audit download
    audit = AuditRecord(
        action="SHARE_DOWNLOAD",
        filename=entry.original_filename,
        file_size=len(encrypted_data),
        status="SUCCESS",
        details=f"Downloaded {entry.download_count}/{entry.max_downloads}. Active={entry.is_active}",
        client_ip_hash=ip_hash
    )
    db.add(audit)
    db.commit()

    log_security_event("SHARE_DOWNLOADED", f"Share: {share_id[:8]}..., Remaining: {entry.max_downloads - entry.download_count}")

    from urllib.parse import quote
    encoded_filename = quote(entry.original_filename)

    return Response(
        content=encrypted_data,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{entry.original_filename}"; filename*=UTF-8\'\'{encoded_filename}',
            "X-Downloads-Remaining": str(max(0, entry.max_downloads - entry.download_count)),
            "Access-Control-Expose-Headers": "Content-Disposition, X-Downloads-Remaining"
        }
    )


@router.delete("/{share_id}")
async def revoke_share(
    share_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Manually revokes an active share and deletes the encrypted blob immediately.
    """
    entry = db.query(SharedFile).filter(SharedFile.share_id == share_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Share not found.")

    entry.is_active = False
    if os.path.exists(entry.storage_path):
        try:
            os.remove(entry.storage_path)
        except Exception:
            pass

    audit = AuditRecord(
        action="SHARE_REVOKE",
        filename=entry.original_filename,
        file_size=0,
        status="SUCCESS",
        details=f"Manually revoked share {share_id[:8]}...",
        client_ip_hash=hash_client_ip(request)
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Share {share_id[:8]} revoked and securely purged."}
