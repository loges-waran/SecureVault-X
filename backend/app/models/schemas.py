from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime

class IntegrityCheckRequest(BaseModel):
    expected_sha256: str = Field(..., min_length=64, max_length=64, description="64-character hex SHA-256")

class IntegrityCheckResponse(BaseModel):
    filename: str
    file_size: int
    hashes: Dict[str, str]
    matches_expected: Optional[bool] = None
    expected_sha256: Optional[str] = None
    message: str

class ShareCreateRequest(BaseModel):
    expiry_hours: int = Field(24, ge=1, le=168, description="Expiration in hours (1h to 7 days)")
    max_downloads: int = Field(1, ge=1, le=100, description="Max allowed downloads before auto-revocation")

class ShareInfoResponse(BaseModel):
    share_id: str
    original_filename: str
    file_size: int
    created_at: datetime
    expires_at: datetime
    downloads_remaining: int
    is_active: bool
    is_expired: bool

class AuditRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    action: str
    filename: str
    file_size: int
    status: str
    details: Optional[str] = None
    sha256_hash: Optional[str] = None

class SystemSecurityStatus(BaseModel):
    platform: str = "SecureVault X"
    version: str = "1.0.0"
    encryption_algorithm: str = "AES-256-GCM (Authenticated Encryption with Associated Data)"
    key_derivation: str = "Scrypt (N=16384, r=8, p=1, 32-byte derived key)"
    integrity_hashing: str = "SHA-256 (256-bit cryptographic digest)"
    salt_entropy_bytes: int = 16
    nonce_entropy_bytes: int = 12
    zero_knowledge_storage: bool = True
    active_shares: int = 0
    total_audited_events: int = 0
