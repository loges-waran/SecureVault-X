from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from ..models.database import get_db, AuditRecord, SharedFile
from ..models.schemas import AuditRecordResponse, SystemSecurityStatus

router = APIRouter(prefix="/api/audit", tags=["Audit & Security Status"])


@router.get("/logs", response_model=List[AuditRecordResponse])
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns recent non-sensitive cryptographic operation audit logs.
    Guarantees no passwords, keys, or plaintext data are exposed.
    """
    records = (
        db.query(AuditRecord)
        .order_by(AuditRecord.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return records


@router.get("/status", response_model=SystemSecurityStatus)
async def get_system_security_status(db: Session = Depends(get_db)):
    """
    Provides real-time security dashboard specifications and operational metrics.
    """
    active_shares = db.query(SharedFile).filter(SharedFile.is_active == True).count()
    total_events = db.query(AuditRecord).count()

    return SystemSecurityStatus(
        platform="SecureVault X",
        version="1.0.0",
        encryption_algorithm="AES-256-GCM (Authenticated Encryption with Associated Data)",
        key_derivation="Scrypt (N=16384, r=8, p=1, 32-byte derived key)",
        integrity_hashing="SHA-256 (256-bit cryptographic digest)",
        salt_entropy_bytes=16,
        nonce_entropy_bytes=12,
        zero_knowledge_storage=True,
        active_shares=active_shares,
        total_audited_events=total_events
    )


@router.delete("/logs")
async def clear_audit_logs(db: Session = Depends(get_db)):
    """
    Clears local audit history.
    """
    db.query(AuditRecord).delete()
    db.commit()
    return {"message": "Audit history cleared."}
