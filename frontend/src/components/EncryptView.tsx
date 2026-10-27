import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Lock, 
  File, 
  Files, 
  Key, 
  Eye, 
  EyeOff, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Cpu
} from 'lucide-react';
import { encryptFileApi, encryptArchiveApi } from '../services/api';
import { PasswordStrength } from './PasswordStrength';

export const EncryptView: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'archive'>('single');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [resultData, setResultData] = useState<{
    downloadUrl: string;
    filename: string;
    sha256: string;
    size: number;
    memberCount?: number;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      if (mode === 'single') {
        setSelectedFiles([filesArr[0]]);
      } else {
        setSelectedFiles(filesArr);
      }
      setErrorMessage(null);
      setResultData(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      if (mode === 'single') {
        setSelectedFiles([filesArr[0]]);
      } else {
        setSelectedFiles(filesArr);
      }
      setErrorMessage(null);
      setResultData(null);
    }
  };

  const handleEncrypt = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select a file to encrypt.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage('A key/passphrase of at least 4 characters is required.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (mode === 'single') {
        const file = selectedFiles[0];
        const res = await encryptFileApi(file, password);
        const url = URL.createObjectURL(res.blob);
        setResultData({
          downloadUrl: url,
          filename: res.filename,
          sha256: res.sha256,
          size: res.blob.size,
        });
      } else {
        const res = await encryptArchiveApi(selectedFiles, password, archiveName || undefined);
        const url = URL.createObjectURL(res.blob);
        setResultData({
          downloadUrl: url,
          filename: res.filename,
          sha256: res.sha256,
          size: res.blob.size,
          memberCount: res.memberCount,
        });
      }
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'An error occurred during authenticated encryption.';
      setErrorMessage(detail);
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
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-cyber-card border border-cyber-border">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            Authenticated File Encryption
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            AES-256-GCM + Scrypt KDF + SHA-256 Envelope Packaging
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-cyber-border">
          <button
            type="button"
            onClick={() => {
              setMode('single');
              setSelectedFiles(selectedFiles.slice(0, 1));
              setResultData(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              mode === 'single'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <File className="w-3.5 h-3.5" />
            Single File (.svx)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('archive');
              setResultData(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              mode === 'archive'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Files className="w-3.5 h-3.5" />
            Multi-file Archive (.svxa)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-cyber-border hover:border-cyan-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-cyber-card/60 hover:bg-cyber-card group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple={mode === 'archive'}
              className="hidden"
            />
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-cyan-500/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors border border-cyber-border group-hover:border-cyan-500/40">
              <Upload className="w-6 h-6" />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-200">
              {mode === 'single' ? 'Drop your file here, or click to browse' : 'Drop multiple files here to bundle and encrypt'}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              Supports PDF, TXT, Images (PNG, JPG), Documents (DOCX), Archives, Binaries (Up to 50MB)
            </p>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-cyber-border text-left">
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  Selected Payload ({selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}):
                </span>
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 pr-2">
                  {selectedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs font-mono bg-slate-900/60 px-3 py-2 rounded border border-cyber-border"
                    >
                      <span className="truncate max-w-[280px] text-slate-300">{f.name}</span>
                      <span className="text-slate-500">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Archive Name Input (if mode is archive) */}
          {mode === 'archive' && (
            <div className="bg-cyber-card p-4 rounded-xl border border-cyber-border">
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                Encrypted Archive Identifier (Optional)
              </label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder="e.g. Q3_Audit_Classified"
                className="w-full bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono outline-none"
              />
            </div>
          )}

          {/* Password & Encryption Form */}
          <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Encryption Passphrase</span>
                <span className="text-cyan-400 text-[10px]">Zero-Storage Policy</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter strong encryption password..."
                  className="w-full bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 font-mono outline-none transition-colors"
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

              {/* Password strength meter */}
              <PasswordStrength password={password} />
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Encrypt Submit Button */}
            <button
              type="button"
              onClick={handleEncrypt}
              disabled={isProcessing || selectedFiles.length === 0}
              className={`w-full py-3 px-4 rounded-lg font-mono text-sm font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                isProcessing || selectedFiles.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-cyber-border'
                  : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.35)]'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Deriving Key & Encrypting AES-256-GCM...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Encrypt & Seal Container
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Cryptographic Specs & Encryption Result */}
        <div className="space-y-6">
          {/* Cryptographic Architecture Card */}
          <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
            <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Cryptographic Pipeline
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-900/60 border border-cyber-border/80">
                <div className="text-slate-400 text-[11px]">Key Derivation Function:</div>
                <div className="text-slate-200 font-semibold mt-0.5">Scrypt (N=16384, r=8, p=1)</div>
                <div className="text-[10px] text-slate-500 mt-1">Memory-hard defense against ASIC & GPU attacks</div>
              </div>

              <div className="p-2.5 rounded bg-slate-900/60 border border-cyber-border/80">
                <div className="text-slate-400 text-[11px]">Authenticated Cipher:</div>
                <div className="text-slate-200 font-semibold mt-0.5">AES-256-GCM (Galois/Counter Mode)</div>
                <div className="text-[10px] text-slate-500 mt-1">128-bit authentication tag with zero plaintext leakage</div>
              </div>

              <div className="p-2.5 rounded bg-slate-900/60 border border-cyber-border/80">
                <div className="text-slate-400 text-[11px]">Envelope Entropy:</div>
                <div className="text-slate-200 font-semibold mt-0.5">16-Byte CSPRNG Salt + 12-Byte Nonce</div>
                <div className="text-[10px] text-slate-500 mt-1">Cryptographically random per container</div>
              </div>

              <div className="p-2.5 rounded bg-slate-900/60 border border-cyber-border/80">
                <div className="text-slate-400 text-[11px]">Integrity Checksum:</div>
                <div className="text-slate-200 font-semibold mt-0.5">SHA-256 Embedded Manifest</div>
                <div className="text-[10px] text-slate-500 mt-1">Re-verified automatically upon decryption</div>
              </div>
            </div>
          </div>

          {/* Encryption Result Card */}
          {resultData && (
            <div className="bg-gradient-to-br from-cyber-card to-cyan-950/20 p-5 rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-semibold">
                <CheckCircle className="w-5 h-5" />
                Container Sealed Successfully
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Output Container:</span>
                  <div className="text-slate-200 font-bold truncate mt-0.5">{resultData.filename}</div>
                </div>

                <div>
                  <span className="text-slate-400">Container Size:</span>
                  <div className="text-slate-200">{formatBytes(resultData.size)}</div>
                </div>

                <div>
                  <span className="text-slate-400">Original Payload SHA-256:</span>
                  <div className="flex items-center gap-1.5 mt-1 bg-slate-900/80 p-2 rounded border border-cyber-border">
                    <span className="text-[10px] text-cyan-300 break-all font-mono">
                      {resultData.sha256}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resultData.sha256)}
                      className="p-1 hover:text-cyan-400 text-slate-400 shrink-0"
                      title="Copy SHA-256"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copiedHash && (
                    <span className="text-[10px] text-emerald-400">Copied to clipboard!</span>
                  )}
                </div>
              </div>

              <a
                href={resultData.downloadUrl}
                download={resultData.filename}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Download className="w-4 h-4" />
                Download Encrypted File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
