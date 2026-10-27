import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.models.database import init_db


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["security"]["cipher"] == "AES-256-GCM"


@pytest.mark.asyncio
async def test_encrypt_and_decrypt_api_roundtrip():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Encrypt file
        file_payload = b"Top secret operational directive."
        password = "DirectivesPassphrase2026!"

        files = {"file": ("directive.txt", file_payload, "text/plain")}
        data = {"password": password}

        enc_res = await client.post("/api/encrypt/file", files=files, data=data)
        assert enc_res.status_code == 200
        encrypted_bytes = enc_res.content
        assert enc_res.headers["content-disposition"].find("directive.txt.svx") != -1

        # 2. Decrypt with correct password
        dec_files = {"file": ("directive.txt.svx", encrypted_bytes, "application/octet-stream")}
        dec_data = {"password": password}

        dec_res = await client.post("/api/decrypt/file", files=dec_files, data=dec_data)
        assert dec_res.status_code == 200
        assert dec_res.content == file_payload
        assert dec_res.headers["x-original-filename"] == "directive.txt"

        # 3. Decrypt with incorrect password -> 401
        dec_bad_pass = await client.post("/api/decrypt/file", files=dec_files, data={"password": "WrongPassword!"})
        assert dec_bad_pass.status_code == 401
        assert "Authentication failed" in dec_bad_pass.json()["detail"]

        # 4. Decrypt with tampered byte -> 401
        tampered_bytes = bytearray(encrypted_bytes)
        tampered_bytes[40] ^= 0x01
        dec_tampered = await client.post(
            "/api/decrypt/file",
            files={"file": ("tampered.svx", bytes(tampered_bytes), "application/octet-stream")},
            data={"password": password}
        )
        assert dec_tampered.status_code == 401


@pytest.mark.asyncio
async def test_integrity_check_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = b"Integrity verification test stream 12345."
        # Known hash for this payload
        import hashlib
        known_hash = hashlib.sha256(payload).hexdigest()

        files = {"file": ("verify.dat", payload, "application/octet-stream")}
        data = {"expected_sha256": known_hash}

        res = await client.post("/api/verify/hash", files=files, data=data)
        assert res.status_code == 200
        resp_json = res.json()
        assert resp_json["matches_expected"] is True
        assert resp_json["hashes"]["sha256"] == known_hash

        # Mismatch
        res_mismatch = await client.post(
            "/api/verify/hash",
            files={"file": ("verify.dat", payload, "application/octet-stream")},
            data={"expected_sha256": "0" * 64}
        )
        assert res_mismatch.status_code == 200
        assert res_mismatch.json()["matches_expected"] is False


@pytest.mark.asyncio
async def test_secure_share_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        file_payload = b"Ephemeral single-use shared secret document."
        share_files = {"file": ("shared_secret.txt", file_payload, "text/plain")}
        share_form = {
            "password": "TemporarySharePassword88!",
            "is_already_encrypted": False,
            "expiry_hours": 1,
            "max_downloads": 1  # Burn after 1 download
        }

        # Create share
        create_res = await client.post("/api/share/create", files=share_files, data=share_form)
        assert create_res.status_code == 200
        share_data = create_res.json()
        share_id = share_data["share_id"]
        assert share_id is not None

        # Check share info
        info_res = await client.get(f"/api/share/{share_id}/info")
        assert info_res.status_code == 200
        assert info_res.json()["downloads_remaining"] == 1

        # Download share #1 (burn-after-reading should consume quota)
        dl_res = await client.get(f"/api/share/{share_id}/download")
        assert dl_res.status_code == 200
        assert len(dl_res.content) > 0

        # Attempt download #2 -> 410 Gone
        dl_res_2 = await client.get(f"/api/share/{share_id}/download")
        assert dl_res_2.status_code == 410


@pytest.mark.asyncio
async def test_audit_logs_zero_sensitive_data():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        logs_res = await client.get("/api/audit/logs")
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert isinstance(logs, list)
        
        # Verify no log entry contains passwords or keys
        for log in logs:
            assert "password" not in log
            assert "key" not in log
            assert "DirectivesPassphrase2026!" not in str(log)
            assert "TemporarySharePassword88!" not in str(log)
