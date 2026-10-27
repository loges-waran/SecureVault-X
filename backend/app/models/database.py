import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

from ..config import DATABASE_URL, STORAGE_DIR

os.makedirs(STORAGE_DIR, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class AuditRecord(Base):
    __tablename__ = "audit_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    action = Column(String(50), nullable=False, index=True)  # ENCRYPT, DECRYPT, VERIFY, SHARE_CREATE, etc.
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    status = Column(String(20), nullable=False)  # SUCCESS, FAILED
    details = Column(String(500), nullable=True)  # Non-sensitive status message
    client_ip_hash = Column(String(64), nullable=True)  # Anonymized IP hash
    sha256_hash = Column(String(64), nullable=True)  # File hash (no plaintext data)


class SharedFile(Base):
    __tablename__ = "shared_files"

    share_id = Column(String(64), primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)  # Path to encrypted blob on disk
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100), default="application/octet-stream")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    max_downloads = Column(Integer, default=1)
    download_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
