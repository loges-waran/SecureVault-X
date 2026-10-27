import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Upload, 
  Key, 
  Eye, 
  EyeOff, 
  Download, 
  AlertTriangle, 
  FileCheck2, 
  Copy, 
  CheckCircle,
  FileCode
} from 'lucide-react';
import { decryptFileApi } from '../services/api';

export const DecryptView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // States for feedback
  const [authError, setAuthError] = useState<string | null>(null);
  const [decryptedResult, setDecryptedResult] = useState<{
    downloadUrl: string;
    originalFilename: string;
    sha256: string;
    size: number;
    isArchive: boolean;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setAuthError(null);
      setDecryptedResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setAuthError(null);
      setDecryptedResult(null);
    }
  };

  const handleDecrypt = async () => {
    if (!selectedFile) {
      setAuthError('Please select a .svx or .svxa container to decrypt.');
      return;
    }
    if (!password) {
      setAuthError('Please enter the decryption password.');
      return;
    }

    setIsProcessing(true);
    setAuthError(null);
    setDecryptedResult(null);

    try {
      const res = await decryptFileApi(selectedFile, password);
      const url = URL.createObjectURL(res.blob);
      setDecryptedResult({
        downloadUrl: url,
        originalFilename: res.originalFilename,
        sha256: res.sha256,
        size: res.blob.size,
        isArchive: res.isArchive,
      });
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        setAuthError(
          'AUTHENTICATION FAILED: Incorrect password or the encrypted file has been tampered with or corrupted. AES-GCM tag verification rejected the payload.'
        );
      } else if (status === 400) {
        setAuthError(detail || 'Invalid container format: File is missing the SVX1 header.');
      } else if (status === 422) {
        setAuthError(`INTEGRITY VERIFICATION FAILED: ${detail}`);
      } else {
        setAuthError(detail || 'An unexpected error occurred during decryption.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Authenticated Container Decryption & Integrity Verification
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cryptographic Authentication Tag (AES-256-GCM) & SHA-256 Re-Verification
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <FileCheck2 className="w-4 h-4" />
          Zero Plaintext Exposure Prior to Tag Validation
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Decryption Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-cyber-border hover:border-emerald-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-cyber-card/60 hover:bg-cyber-card group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".svx,.svxa"
              className="hidden"
            />
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-emerald-500/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors border border-cyber-border group-hover:border-emerald-500/40">
              <Upload className="w-6 h-6" />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-200">
              {selectedFile ? selectedFile.name : 'Select or drop an encrypted (.svx or .svxa) container'}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              Only authentic SecureVault X containers will pass authentication tag verification
            </p>

            {selectedFile && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-cyber-border text-xs font-mono text-cyan-400">
                <FileCode className="w-3.5 h-3.5" />
                {selectedFile.name} ({formatBytes(selectedFile.size)})
              </div>
            )}
          </div>

          {/* Password Input & Decrypt Button */}
          <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                Decryption Key / Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the passphrase used during encryption..."
                  className="w-full bg-slate-900/90 border border-cyber-border focus:border-emerald-500 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 font-mono outline-none transition-colors"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error / Tamper Alert */}
            {authError && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-300 text-xs font-mono space-y-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  AUTHENTICATION & INTEGRITY ALERT
                </div>
                <p className="leading-relaxed">{authError}</p>
                <div className="text-[11px] text-rose-400/80 pt-1 border-t border-rose-500/30">
                  AES-256-GCM authentication prevents any altered ciphertext from being executed or saved.
                </div>
              </div>
            )}

            {/* Decrypt Submit Button */}
            <button
              type="button"
              onClick={handleDecrypt}
              disabled={isProcessing || !selectedFile || !password}
              className={`w-full py-3 px-4 rounded-lg font-mono text-sm font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                isProcessing || !selectedFile || !password
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-cyber-border'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Authenticating Tag & Verifying SHA-256...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Authenticate & Decrypt
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Decrypted Result or Verification Details */}
        <div className="space-y-6">
          {decryptedResult ? (
            <div className="bg-gradient-to-br from-cyber-card to-emerald-950/20 p-5 rounded-xl border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)] space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold">
                <CheckCircle className="w-5 h-5" />
                AUTHENTICATED & VERIFIED
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-900/80 border border-cyber-border">
                  <span className="text-slate-400 text-[11px]">Original File Name:</span>
                  <div className="text-slate-100 font-bold truncate mt-0.5">
                    {decryptedResult.originalFilename}
                  </div>
                  {decryptedResult.isArchive && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[10px] text-cyan-300">
                      Multi-File Archive Package
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded bg-slate-900/80 border border-cyber-border">
                  <span className="text-slate-400 text-[11px]">Decrypted Payload Size:</span>
                  <div className="text-slate-200 font-semibold mt-0.5">
                    {formatBytes(decryptedResult.size)}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/80 border border-cyber-border">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Verified SHA-256:</span>
                    <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-semibold">
                      <CheckCircle className="w-3 h-3" /> Matched Original
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-cyan-300 break-all font-mono">
                      {decryptedResult.sha256}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(decryptedResult.sha256)}
                      className="p-1 hover:text-cyan-400 text-slate-400 shrink-0"
                      title="Copy SHA-256"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copiedHash && (
                    <span className="text-[10px] text-emerald-400 mt-1 block">Copied to clipboard!</span>
                  )}
                </div>
              </div>

              <a
                href={decryptedResult.downloadUrl}
                download={decryptedResult.originalFilename}
                className="w-full py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Download className="w-4 h-4" />
                Download Decrypted File
              </a>
            </div>
          ) : (
            <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
              <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Security Verification Assurances
              </h3>

              <div className="space-y-3 text-xs font-mono text-slate-400">
                <div className="p-3 rounded bg-slate-900/60 border border-cyber-border">
                  <span className="text-slate-200 font-semibold block mb-1">Authenticated Decryption</span>
                  Decryption uses AES-256 in Galois/Counter Mode. The GCM authentication tag guarantees that the ciphertext was generated with your exact password.
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-cyber-border">
                  <span className="text-slate-200 font-semibold block mb-1">Double Verification Guard</span>
                  Even if the tag validates, the payload's SHA-256 hash is computed in real-time and matched against the encrypted manifest before bytes are released.
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-cyber-border">
                  <span className="text-slate-200 font-semibold block mb-1">Zip-Slip Defense</span>
                  Archives are strictly sanitized against relative path directory traversal attacks (`../`).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
