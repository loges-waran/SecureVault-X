# 🛡️ SecureVault X — Advanced File Encryption & Integrity Verification Platform

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev)
[![Cryptography](https://img.shields.io/badge/Cipher-AES--256--GCM-success.svg)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
[![KDF](https://img.shields.io/badge/KDF-Scrypt-orange.svg)](https://www.rfc-editor.org/rfc/rfc7914)
[![Integrity](https://img.shields.io/badge/Digest-SHA--256-blueviolet.svg)](https://csrc.nist.gov/publications/detail/fips/180-4/final)

**SecureVault X** is an enterprise-grade file encryption, authentication, and integrity verification platform designed with a **Zero-Knowledge** architecture. It provides military-grade authenticated encryption using **AES-256-GCM**, password key derivation via memory-hard **Scrypt**, cryptographic **SHA-256** checksum verification, and safe multi-file container packaging.

---

## 🔐 Cryptographic Specifications

| Component | Standard / Algorithm | Parameters / Description |
| :--- | :--- | :--- |
| **Authenticated Cipher** | **AES-256-GCM** | 256-bit symmetric key, 128-bit authentication tag, Galois/Counter Mode (AEAD) |
| **Key Derivation (KDF)** | **Scrypt** | $N=16384$, $r=8$, $p=1$, 32-byte derived key. Resilient against GPU/ASIC brute-force attacks |
| **Envelope Entropy** | **CSPRNG** | 16-byte (128-bit) random salt and 12-byte (96-bit) random nonce generated via `os.urandom` |
| **File Integrity** | **SHA-256** | 256-bit cryptographic digest verified using constant-time comparison (`hmac.compare_digest`) |
| **Container Format** | **.svx / .svxa** | Magic header `SVX1` + 16B Salt + 12B Nonce + Authenticated Ciphertext & Tag |
| **Persistence Model** | **Zero-Knowledge** | Plaintext files, decryption keys, and passwords are **never** stored on disk or logged |

---

## ✨ Key Features

1. **Authenticated File Encryption (.svx)**
   - Protects any file format: PDF, documents, spreadsheets, high-resolution images, source code, and binaries.
   - Derives a distinct 256-bit key for every operation using a cryptographically random salt and nonce.

2. **Safe Multi-File Archive Encryption (.svxa)**
   - Securely bundles multiple files into a single encrypted container.
   - Enforces strict **Zip-Slip defense** (blocking directory traversal `../` paths) and safe size thresholds.

3. **Tamper Detection & Authenticated Decryption**
   - Rejects corrupted or manipulated files before releasing decrypted plaintext.
   - Single-bit modifications in the ciphertext or authentication tag immediately trigger a security alert.

4. **SHA-256 Integrity Verification Hub**
   - Instant calculation of SHA-256, SHA-512, and legacy MD5 checksums.
   - Real-time comparison against expected hashes with side-channel immune constant-time validation.
   - **Interactive 1-Bit Avalanche Demonstration**: Visualizes how a single-bit flip completely changes cryptographic hashes.

5. **Zero-Knowledge Ephemeral File Sharing**
   - Share encrypted files with configurable expiration (1h to 7 days) and download limits (1 to 50).
   - **Burn-After-Reading**: The server automatically purges the ciphertext file from disk once download limits are reached.
   - The server only holds encrypted ciphertext and never possesses passwords or decryption keys.

6. **SQLite Security Audit Trail**
   - Non-sensitive operational audit log recording actions (`ENCRYPT`, `DECRYPT`, `VERIFY`, `SHARE`).
   - Strict privacy safeguards: Passwords, keys, and file contents are never logged.

7. **Dark Cybersecurity Interface**
   - Responsive HUD-style interface featuring password entropy metering, status beacons, and instant copy/download actions.

---

## 📁 Project Structure

```text
SecureVault-X/
├── backend/
│   ├── app/
│   │   ├── crypto/
│   │   │   ├── cipher.py        # AES-256-GCM + Scrypt KDF + packaging
│   │   │   ├── integrity.py     # SHA-256 constant-time verification
│   │   │   └── archive.py       # Safe zip bundling & Zip-Slip defense
│   │   ├── models/
│   │   │   ├── database.py      # SQLite models (AuditRecord, SharedFile)
│   │   │   └── schemas.py       # Pydantic v2 schemas
│   │   ├── routers/
│   │   │   ├── encrypt.py       # Single & multi-file encryption endpoints
│   │   │   ├── decrypt.py       # Authenticated decryption endpoint
│   │   │   ├── verify.py        # SHA-256 checksum & tamper demo endpoints
│   │   │   ├── share.py         # Ephemeral zero-knowledge file sharing
│   │   │   └── audit.py         # Security status & audit logs
│   │   ├── utils/
│   │   │   └── security.py      # Path sanitization, IP anonymization, safe logger
│   │   ├── config.py            # Security limits & crypto parameters
│   │   └── main.py              # FastAPI app with static mount & security headers
│   ├── tests/
│   │   ├── test_crypto.py       # Cryptographic unit tests
│   │   └── test_api.py          # API integration & security lifecycle tests
│   ├── pytest.ini               # Test configuration
│   └── requirements.txt         # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Cyber navigation & live health beacon
│   │   │   ├── EncryptView.tsx      # Single/multi-file encryption workspace
│   │   │   ├── DecryptView.tsx      # Authenticated decryption & tamper alerts
│   │   │   ├── IntegrityView.tsx    # SHA-256 hub & 1-bit avalanche simulation
│   │   │   ├── ShareView.tsx        # Ephemeral sharing & recipient download
│   │   │   ├── AuditView.tsx        # Security audit log & architecture metrics
│   │   │   └── PasswordStrength.tsx # Password entropy visualizer
│   │   ├── services/
│   │   │   └── api.ts               # Typed Axios client
│   │   ├── App.tsx                  # Main application orchestrator
│   │   ├── index.css                # Tailwind CSS styling & animations
│   │   └── main.tsx                 # React entry point
│   ├── index.html               # Frontend root HTML
│   ├── package.json             # Frontend dependencies & scripts
│   ├── tsconfig.json            # TypeScript configuration
│   ├── tailwind.config.js       # Cyber theme tokens & animations
│   └── vite.config.ts           # Vite bundler & reverse proxy
├── render.yaml                  # Render deployment configuration
├── .gitignore                   # Safe Git exclusion file
└── README.md                    # Project documentation
```

---

## 🚀 Local Quickstart

### Prerequisites
- **Python 3.10+** (tested on 3.11, 3.12, 3.13)
- **Node.js 18+** & **npm**

### 1. Backend Setup & Run

```bash
# Navigate to backend and create virtual environment
cd backend
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at: `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup & Run

In a separate terminal:

```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend interface will open at: `http://localhost:5173`.

---

## 🧪 Running Automated Tests

Run the full automated test suite covering encryption roundtrips, incorrect passwords, corrupted files, and SHA-256 verification:

```bash
# From workspace root
backend\.venv\Scripts\pytest.exe backend\tests -v
```

### Test Coverage Highlights:
- ✅ Key derivation consistency and salt uniqueness (`Scrypt`)
- ✅ Full roundtrip encryption and decryption for text and binary PDF files
- ✅ Detection of wrong passwords (`TamperedOrWrongPasswordError` / HTTP 401)
- ✅ Detection of 1-bit ciphertext tampering via AES-GCM tag verification
- ✅ Corrupted container header rejection (`InvalidMagicError`)
- ✅ SHA-256 constant-time integrity verification and digest calculations
- ✅ Zip-Slip traversal defense and multi-file archive safety
- ✅ Ephemeral share lifecycle and Burn-After-Reading quota exhaustion
- ✅ Zero sensitive data leakage in audit records

---

## ☁️ Deployment Configuration (Render)

SecureVault X includes a production-ready `render.yaml` blueprint.

### One-Click Blueprint Deployment:
1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint**.
3. Select your repository. Render will automatically parse `render.yaml`:
   - Builds frontend assets (`npm run build`).
   - Installs Python dependencies (`pip install -r backend/requirements.txt`).
   - Serves the unified high-performance application via `uvicorn`.

---

## 🛡️ Security & Compliance Checklist

- [x] **No Hardcoded Keys**: Cryptographic keys are derived dynamically and never stored.
- [x] **NIST SP 800-38D Compliant**: AES-256 in Galois/Counter Mode.
- [x] **OWASP KDF Standards**: Memory-hard Scrypt derivation ($N=16384, r=8, p=1$).
- [x] **Zero Plaintext Storage**: Plaintext payloads exist strictly in transient volatile memory.
- [x] **Path Traversal Protection**: Uploaded filenames and zip archive members are strictly sanitized.
- [x] **Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, strict CORS.
- [x] **Timing Attack Immunity**: Constant-time checksum comparisons via `hmac.compare_digest`.
