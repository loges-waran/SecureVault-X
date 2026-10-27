import React, { useState, useRef } from 'react';
import { 
  FileCheck, 
  Upload, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Cpu, 
  FileCode,
  Zap
} from 'lucide-react';
import { verifyHashApi, tamperSimulationApi, IntegrityResult } from '../services/api';

export const IntegrityView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expectedSha256, setExpectedSha256] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tamper Demo State
  const [isTampering, setIsTampering] = useState(false);
  const [tamperResult, setTamperResult] = useState<{
    original_sha256: string;
    tampered_sha256: string;
    flipped_byte_index: number;
    explanation: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setTamperResult(null);
    }
  };

  const handleCalculateHashes = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setResult(null);
    try {
      const data = await verifyHashApi(selectedFile, expectedSha256 || undefined);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunTamperDemo = async () => {
    if (!selectedFile) return;
    setIsTampering(true);
    setTamperResult(null);
    try {
      const data = await tamperSimulationApi(selectedFile, 0);
      setTamperResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTampering(false);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            Cryptographic Integrity & Checksum Verification Hub
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            SHA-256 Digest Analysis, Constant-Time Verification & Tamper Simulation
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
          Strict Constant-Time Comparison
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload & Verify Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Selector */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-cyber-border hover:border-cyan-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-cyber-card/60 hover:bg-cyber-card group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-cyan-500/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors border border-cyber-border group-hover:border-cyan-500/40">
              <Upload className="w-6 h-6" />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-200">
              {selectedFile ? selectedFile.name : 'Select or drop any file to compute checksums'}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              Inspects files of any format (PDF, binaries, documents, images)
            </p>

            {selectedFile && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-cyber-border text-xs font-mono text-cyan-400">
                <FileCode className="w-3.5 h-3.5" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Expected Hash Input & Actions */}
          <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                Expected SHA-256 Checksum (Optional for verification)
              </label>
              <input
                type="text"
                value={expectedSha256}
                onChange={(e) => setExpectedSha256(e.target.value.trim())}
                placeholder="Paste expected 64-character hex hash (e.g., e3b0c44298fc...)"
                className="w-full bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg px-3 py-2.5 text-xs text-slate-200 font-mono outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCalculateHashes}
                disabled={isProcessing || !selectedFile}
                className={`flex-1 py-3 px-4 rounded-lg font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                  isProcessing || !selectedFile
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-cyber-border'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Computing Cryptographic Hashes...
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    Calculate & Verify Checksums
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRunTamperDemo}
                disabled={isTampering || !selectedFile}
                className={`py-3 px-4 rounded-lg font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 border ${
                  isTampering || !selectedFile
                    ? 'bg-slate-800 text-slate-500 border-cyber-border cursor-not-allowed'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                }`}
                title="Flips 1 bit in this file to prove the cryptographic avalanche effect"
              >
                {isTampering ? (
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Simulate 1-Bit Corruption
              </button>
            </div>
          </div>

          {/* Tamper Simulation Result */}
          {tamperResult && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-cyber-card to-amber-950/20 border border-amber-500/40 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Zap className="w-4 h-4" />
                Cryptographic Avalanche Proof (1-Bit Modification at Byte index {tamperResult.flipped_byte_index})
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded bg-slate-900/90 border border-cyber-border">
                  <span className="text-slate-400 text-[11px] block">Original SHA-256:</span>
                  <span className="text-emerald-400 break-all text-[11px] font-mono">{tamperResult.original_sha256}</span>
                </div>

                <div className="p-2.5 rounded bg-slate-900/90 border border-amber-500/30">
                  <span className="text-slate-400 text-[11px] block">Tampered SHA-256 (1 bit flipped):</span>
                  <span className="text-rose-400 break-all text-[11px] font-mono">{tamperResult.tampered_sha256}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-cyber-border">
                {tamperResult.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Computed Hashes & Comparison */}
        <div className="space-y-6">
          {result ? (
            <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
              <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Cryptographic Digest Results
              </h3>

              {/* Match Indicator */}
              {result.matches_expected !== null && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                    result.matches_expected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {result.matches_expected ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {result.matches_expected ? 'INTEGRITY VERIFIED' : 'INTEGRITY MISMATCH DETECTED'}
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90">{result.message}</p>
                  </div>
                </div>
              )}

              {/* Hashes List */}
              <div className="space-y-3 font-mono text-xs">
                {/* SHA-256 */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/30 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-bold">SHA-256 (Primary):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('sha256', result.hashes.sha256)}
                      className="text-slate-400 hover:text-cyan-400 p-1"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-200 break-all">{result.hashes.sha256}</div>
                  {copiedKey === 'sha256' && (
                    <span className="text-[10px] text-emerald-400 block">Copied SHA-256!</span>
                  )}
                </div>

                {/* SHA-512 */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-cyber-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">SHA-512 (512-bit):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('sha512', result.hashes.sha512)}
                      className="text-slate-400 hover:text-cyan-400 p-1"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-300 break-all">{result.hashes.sha512}</div>
                  {copiedKey === 'sha512' && (
                    <span className="text-[10px] text-emerald-400 block">Copied SHA-512!</span>
                  )}
                </div>

                {/* MD5 */}
                <div className="p-3 rounded-lg bg-slate-900/80 border border-cyber-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium text-[11px]">MD5 (Legacy Fingerprint):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('md5', result.hashes.md5)}
                      className="text-slate-400 hover:text-cyan-400 p-1"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 break-all">{result.hashes.md5}</div>
                  {copiedKey === 'md5' && (
                    <span className="text-[10px] text-emerald-400 block">Copied MD5!</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-3 font-mono text-xs text-slate-400">
              <h3 className="text-cyan-400 uppercase tracking-wider font-semibold">Integrity Protocol</h3>
              <p className="leading-relaxed">
                SHA-256 produces a 256-bit (32-byte) message digest. It is mathematically infeasible to find two different files that produce the exact same SHA-256 hash (collision resistance).
              </p>
              <div className="p-3 rounded bg-slate-900/60 border border-cyber-border">
                <span className="text-slate-200 font-semibold block mb-1">Constant-Time Comparison</span>
                Hashes are verified using constant-time comparison (<code className="text-cyan-400">hmac.compare_digest</code>) to eliminate side-channel timing analysis attacks.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
