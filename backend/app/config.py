import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Security & limits
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_BYTES", 50 * 1024 * 1024))  # 50MB
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")

# Crypto specifications
MAGIC_HEADER = b"SVX1"
SALT_SIZE = 16  # bytes (128 bits)
NONCE_SIZE = 12  # bytes (96 bits) for AES-256-GCM
KEY_SIZE = 32  # bytes (256 bits)
TAG_SIZE = 16  # bytes (128 bits)

# Scrypt KDF parameters (N=16384, r=8, p=1 recommended by OWASP / standard libraries)
SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1

# Database & Storage
STORAGE_DIR = BASE_DIR / "temp_storage"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'securevault.db'}")
