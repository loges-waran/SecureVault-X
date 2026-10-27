# 🛡️ SecureVault X — Advanced File Encryption & Integrity Verification Platform

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-securevault--x.onrender.com-00f2fe?style=for-the-badge&logo=render&logoColor=white)](https://securevault-x.onrender.com)
[![Render Status](https://img.shields.io/badge/Render-Deployed%20Active-brightgreen?style=for-the-badge&logo=render&logoColor=white)](https://securevault-x.onrender.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-loges--waran%2FSecureVault--X-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/loges-waran/SecureVault-X)

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev)
[![Cipher](https://img.shields.io/badge/Cipher-AES--256--GCM-success.svg)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
[![KDF](https://img.shields.io/badge/KDF-Scrypt-orange.svg)](https://www.rfc-editor.org/rfc/rfc7914)
[![Integrity](https://img.shields.io/badge/Digest-SHA--256-blueviolet.svg)](https://csrc.nist.gov/publications/detail/fips/180-4/final)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED.svg)](https://www.docker.com/)

</div>

---

### 🚀 Live Application & Repository

> 🌐 **Live Website**: **[https://securevault-x.onrender.com](https://securevault-x.onrender.com)**  
> 📦 **GitHub Repository**: **[https://github.com/loges-waran/SecureVault-X](https://github.com/loges-waran/SecureVault-X)**  
> 📡 **Health Endpoint**: **[https://securevault-x.onrender.com/api/health](https://securevault-x.onrender.com/api/health)**

---

## 📖 Project Overview

**SecureVault X** is an enterprise-grade file encryption, authentication, and integrity verification platform architected with a strict **Zero-Knowledge** security posture. It combines authenticated symmetric encryption (**AES-256-GCM**), memory-hard password key derivation (**Scrypt**), cryptographic checksum verification (**SHA-256**), safe multi-file container packaging, and ephemeral file sharing with **Burn-After-Reading** access controls.

### Core Security Principles:
- **Zero-Knowledge Storage**: Plaintext files, derived keys, and passphrases are **never** persisted to disk or recorded in logs. They reside strictly in transient volatile memory during the operation.
- **Authenticated Encryption with Associated Data (AEAD)**: Ensures confidentiality and integrity simultaneously. Encrypted files cannot be altered without failing authentication.
- **Defense in Depth**: Every container carries an embedded SHA-256 checksum in addition to the AES-GCM 128-bit authentication tag, guaranteeing double validation.
- **Side-Channel Immunity**: Checksums are validated using constant-time comparison (`hmac.compare_digest`) to prevent timing attack vulnerabilities.

---

## 🔐 Cryptographic Specifications

| Component | Standard / Algorithm | Parameters / Description |
| :--- | :--- | :--- |
| **Authenticated Cipher** | **AES-256-GCM** | 256-bit symmetric key, 128-bit authentication tag, Galois/Counter Mode (NIST SP 800-38D). |
| **Key Derivation (KDF)** | **Scrypt** | $N=16384$, $r=8$, $p=1$, 32-byte derived key. Memory-hard defense against ASIC/GPU brute-force attacks (RFC 7914). |
| **Envelope Entropy** | **CSPRNG** | 16-byte (128-bit) random salt and 12-byte (96-bit) random nonce generated via `os.urandom`. |
| **File Integrity** | **SHA-256** | 256-bit cryptographic digest verified using constant-time comparison (`hmac.compare_digest`). |
| **Container Format** | **.svx / .svxa** | Magic header `SVX1` + 16B Salt + 12B Nonce + Authenticated Ciphertext & Tag. |
| **Persistence Model** | **Zero-Knowledge** | Plaintext files, decryption keys, and passwords are **never** stored on disk or logged. |

---

## ✨ Features & Capabilities

### 1. Authenticated File Encryption (`.svx`)
- Protects any file format: PDF documents, Word/Excel files, images (PNG, JPG), source code, archives, and binaries (up to 50MB).
- Unique 16-byte random salt and 12-byte nonce generated per file encryption.
- Encrypts metadata (original filename, MIME type, size, SHA-256) inside the authenticated container.

### 2. Multi-File Safe Archive Encryption (`.svxa`)
- Bundles multiple files into a single encrypted container.
- Built-in **Zip-Slip defense**: Strictly sanitizes archive members, rejecting directory traversal sequences (`../`) and absolute paths.
- Uncompressed size thresholds prevent zip-bomb denial-of-service attacks.

### 3. Authenticated Decryption with Tamper Detection
- Fast GCM tag verification rejects corrupted or altered files prior to releasing plaintext.
- Detects wrong passwords with clear, actionable security alerts (HTTP 401).
- Single-bit modifications in ciphertext or tag trigger immediate authentication failure.

### 4. SHA-256 Integrity Verification Hub
- Standalone cryptographic checksum suite for computing SHA-256, SHA-512, and MD5 digests for any file.
- Side-channel immune comparison against expected hashes.
- **Interactive 1-Bit Avalanche Demonstration**: Flips a single bit in a file to visually prove the avalanche effect and demonstrate how altering 1 bit completely transforms the SHA-256 hash.

### 5. Zero-Knowledge Ephemeral File Sharing
- Share encrypted files with configurable expiration (1 hour to 7 days) and download limits (1 to 50).
- **Burn-After-Reading**: The server automatically purges the ciphertext file from disk once download limits are reached.
- The server stores **only** the encrypted ciphertext blob. The decryption password is never sent to or stored on the server.
- Recipient can authenticate and decrypt directly in the browser or save the raw `.svx` container.

### 6. SQLite Security Audit Trail
- Non-sensitive operational audit log recording actions (`ENCRYPT`, `DECRYPT`, `VERIFY`, `SHARE_CREATE`, `SHARE_DOWNLOAD`).
- Anonymized client IP hashing (`SHA-256`) preserves privacy while maintaining audit traceability.
- Zero sensitive data leakage: Passwords, keys, and file contents are never logged.

### 7. Responsive Dark Cybersecurity HUD
- Neon cyan, emerald, and slate dark aesthetic.
- Real-time password entropy visualizer with Scrypt parameter explanations.
- Live backend connection beacon (`SEC_ACTIVE` / `OFFLINE`).

---

## 🛠️ Tech Stack

```text
Frontend:
├── React 18.3 (Single-Page Application)
├── Vite 5.4 (High-performance bundler)
├── TypeScript (Strict type safety)
├── Tailwind CSS (Cyber HUD design system)
├── Lucide React (Cybersecurity icon suite)
└── Axios (API communication)

Backend:
├── Python 3.11 / 3.13
├── FastAPI 0.110+ (Modern, asynchronous REST API)
├── Uvicorn (ASGI production server)
├── Cryptography / PyCA (AES-256-GCM, Scrypt KDF)
├── SQLAlchemy (SQLite metadata storage)
├── Pydantic v2 (Input validation & data schemas)
└── Pytest & HTTPX (Automated test suite)

Deployment & DevOps:
├── Docker (Multi-stage production build)
├── Render (Containerized Web Service deployment)
└── Git & GitHub (Version control & CI-ready configuration)
```

---

## 🖼️ User Interface & Workflow

```text
+-----------------------------------------------------------------------------------+
|  [LOCK] SECUREVAULT X  [AES-256-GCM]           [Encrypt] [Decrypt] [Integrity] [Share] [Audit]  (● SEC_ACTIVE) |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [+] Authenticated File Encryption                                                |
|  -------------------------------------------------------------------------------  |
|  [ Single File (.svx) ]   [ Multi-File Archive (.svxa) ]                          |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |             [UPLOAD ICON]  Drop your file here, or click to browse          |  |
|  |             Supports PDF, TXT, Images, DOCX, Binaries (Up to 50MB)          |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  ENCRYPTION PASSPHRASE: [ ************************ ] [EYE]                        |
|  KEY ENTROPY: [====================================] Military Grade (High)        |
|                                                                                   |
|  [  LOCK & SEAL CONTAINER (AES-256-GCM)  ]                                        |
|                                                                                   |
|  OUTPUT CONTAINER: directive.pdf.svx (Downloaded)                                 |
|  ORIGINAL SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b...  |
+-----------------------------------------------------------------------------------+
```

---

## 📁 Repository Structure

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
├── Dockerfile                   # Multi-stage production container
├── render.yaml                  # Render deployment configuration
├── .gitignore                   # Safe Git exclusion file
└── README.md                    # Project documentation
```

---

## 💻 Local Quickstart

### Prerequisites
- **Python 3.10+** (tested on 3.11, 3.12, 3.13)
- **Node.js 18+** & **npm**

### Option A: Run via Virtual Environment

#### 1. Backend Setup:
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
API Documentation will be accessible at: `http://127.0.0.1:8000/docs`.

#### 2. Frontend Setup (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Option B: Run via Docker (Unified Production Build)

```bash
# Build Docker image
docker build -t securevault-x .

# Run container
docker run -p 8000:8000 securevault-x
```
Access the application at: `http://localhost:8000`.

---

## 🧪 Automated Test Suite

Run the full automated test suite covering encryption roundtrips, incorrect passwords, corrupted files, and SHA-256 verification:

```bash
# From workspace root
backend\.venv\Scripts\pytest.exe backend\tests -v
```

### Test Coverage Results:
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

## ☁️ Deployment on Render

This repository is configured for zero-configuration deployment on Render via [`render.yaml`](./render.yaml) and [`Dockerfile`](./Dockerfile).

1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint**.
2. Select your repository: **`loges-waran/SecureVault-X`**.
3. Render automatically builds the multi-stage Docker container and launches the live web service at **`https://securevault-x.onrender.com`**.

---

## 🛡️ Security & Compliance Checklist

- [x] **No Hardcoded Keys**: Cryptographic keys are derived dynamically and never stored.
- [x] **NIST SP 800-38D Compliant**: AES-256 in Galois/Counter Mode.
- [x] **OWASP KDF Standards**: Memory-hard Scrypt derivation ($N=16384, r=8, p=1$).
- [x] **Zero Plaintext Storage**: Plaintext payloads exist strictly in transient volatile memory.
- [x] **Path Traversal Protection**: Uploaded filenames and zip archive members are strictly sanitized.
- [x] **Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, strict CORS.
- [x] **Timing Attack Immunity**: Constant-time checksum comparisons via `hmac.compare_digest`.
