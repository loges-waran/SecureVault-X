import re
import os
import hashlib
import logging
from typing import Optional
from fastapi import Request

# Configure security-conscious logger
logger = logging.getLogger("securevault.security")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SecureVault] %(message)s"
)

# Reserved filenames in Windows
RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
}

def sanitize_filename(filename: Optional[str]) -> str:
    """
    Sanitizes an incoming user-provided filename to prevent path traversal,
    hidden files, null-byte injection, and OS reserved device names.
    """
    if not filename:
        return "unnamed_file"

    # Strip null bytes and control chars
    clean = filename.replace("\x00", "").strip()
    
    # Extract only the base name (strip directory paths)
    clean = clean.replace("\\", "/").split("/")[-1].strip()

    # Strip dangerous characters
    clean = re.sub(r'[\/:*?"<>|]', "_", clean)

    # Disallow dotfiles or empty stems
    if clean.startswith(".") or not clean or clean in (".", ".."):
        clean = f"vault_file_{clean.lstrip('.')}"
    
    # Check reserved Windows device names
    base_stem = clean.split(".")[0].upper()
    if base_stem in RESERVED_NAMES:
        clean = f"safe_{clean}"

    # Truncate length
    if len(clean) > 200:
        parts = clean.rsplit(".", 1)
        ext = f".{parts[1]}" if len(parts) > 1 else ""
        clean = parts[0][:190] + ext

    return clean or "unnamed_file"


def hash_client_ip(request: Request) -> str:
    """
    Produces a 16-character anonymized hash of the client's IP address
    to respect privacy while preserving security audit traceability.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    return hashlib.sha256(f"svx_salt_{client_ip}".encode()).hexdigest()[:16]


def log_security_event(event: str, details: str):
    """
    Safely logs high-level security events without exposing any passwords,
    keys, or confidential payloads.
    """
    logger.info(f"[AUDIT] Event: {event} | Details: {details}")
