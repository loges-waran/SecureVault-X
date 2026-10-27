import io
import zipfile
from typing import List, Tuple

class ArchiveSecurityError(Exception):
    """Raised when an archive member violates security policies (zip slip, zip bomb, etc.)"""
    pass

MAX_ZIP_MEMBERS = 100
MAX_UNCOMPRESSED_TOTAL_SIZE = 150 * 1024 * 1024  # 150MB

def create_secure_zip(files: List[Tuple[str, bytes]]) -> bytes:
    """
    Bundles multiple files into an in-memory zip archive with normalized safe relative names.
    files: List of (filename, file_bytes)
    """
    if len(files) > MAX_ZIP_MEMBERS:
        raise ArchiveSecurityError(f"Maximum of {MAX_ZIP_MEMBERS} files allowed per archive.")
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for raw_name, content in files:
            # Normalize and remove directory traversal attempts
            safe_name = raw_name.replace("\\", "/").split("/")[-1].strip()
            if not safe_name or safe_name in (".", ".."):
                safe_name = "unnamed_file"
            zf.writestr(safe_name, content)
    
    return zip_buffer.getvalue()

def extract_secure_zip(zip_bytes: bytes) -> List[Tuple[str, bytes]]:
    """
    Safely extracts all members from a zip archive in-memory, enforcing zip-slip protection
    and uncompressed size limits to prevent zip-bomb attacks.
    """
    extracted_files: List[Tuple[str, bytes]] = []
    total_extracted_size = 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        infolist = zf.infolist()
        if len(infolist) > MAX_ZIP_MEMBERS:
            raise ArchiveSecurityError(f"Archive exceeds maximum member limit ({MAX_ZIP_MEMBERS}).")

        for member in infolist:
            # Check for directory traversal / Zip Slip
            filename = member.filename.replace("\\", "/")
            if filename.startswith("/") or ".." in filename.split("/"):
                raise ArchiveSecurityError(f"Malicious member path detected: {member.filename}")
            
            # Skip pure directory entries
            if member.is_dir():
                continue

            # Check uncompressed size
            total_extracted_size += member.file_size
            if total_extracted_size > MAX_UNCOMPRESSED_TOTAL_SIZE:
                raise ArchiveSecurityError("Archive exceeds safe uncompressed size limit (zip bomb protection).")

            content = zf.read(member)
            clean_name = filename.split("/")[-1]
            extracted_files.append((clean_name, content))

    return extracted_files
