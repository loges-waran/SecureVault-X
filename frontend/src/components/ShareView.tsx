import React, { useState, useRef } from 'react';
import { 
  Share2, 
  Upload, 
  Key, 
  Clock, 
  Flame, 
  Copy, 
  Download, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  createShareApi, 
  getShareInfoApi, 
  downloadSharedFileApi, 
  decryptFileApi, 
  ShareInfo 
} from '../services/api';
import { PasswordStrength } from './PasswordStrength';

export const ShareView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'access'>('create');

  // Creation State
  const [fileToShare, setFileToShare] = useState<File | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<{
    share_id: string;
    filename: string;
    file_size: number;
    expires_at: string;
    max_downloads: number;
  } | null>(null);

  // Access State
  const [accessShareId, setAccessShareId] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [fetchedShareInfo, setFetchedShareInfo] = useState<ShareInfo | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [downloadPassword, setDownloadPassword] = useState('');
  const [showDownloadPassword, setShowDownloadPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [decryptedFileUrl, setDecryptedFileUrl] = useState<{
    url: string;
    filename: string;
    size: number;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateShare = async () => {
    if (!fileToShare) {
      setCreateError('Please select a file to share.');
      return;
    }
    if (!sharePassword || sharePassword.length < 4) {
      setCreateError('Please enter an encryption passphrase (minimum 4 characters).');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreatedShare(null);

    try {
      const res = await createShareApi(
        fileToShare,
        sharePassword,
        false,
        expiryHours,
        maxDownloads
      );
      setCreatedShare(res);
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.detail || 'Failed to create secure share.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFetchShareInfo = async () => {
    if (!accessShareId.trim()) return;
    setIsFetchingInfo(true);
    setAccessError(null);
    setFetchedShareInfo(null);
    setDecryptedFileUrl(null);

    try {
      const info = await getShareInfoApi(accessShareId.trim());
      setFetchedShareInfo(info);
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      if (status === 410) {
        setAccessError('This secure share has expired or its maximum downloads limit was reached (Burn-After-Reading).');
      } else {
        setAccessError('Share ID not found or invalid.');
      }
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleDownloadAndDecrypt = async () => {
    if (!fetchedShareInfo || !downloadPassword) {
      setAccessError('Please enter the password to authenticate and decrypt.');
      return;
    }

    setIsDownloading(true);
    setAccessError(null);

    try {
      // 1. Download encrypted .svx payload
      const dlRes = await downloadSharedFileApi(fetchedShareInfo.share_id);
      const encryptedFile = new File([dlRes.blob], dlRes.filename, { type: 'application/octet-stream' });

      // 2. Decrypt locally with password
      const decRes = await decryptFileApi(encryptedFile, downloadPassword);
      const url = URL.createObjectURL(decRes.blob);
      setDecryptedFileUrl({
        url,
        filename: decRes.originalFilename,
        size: decRes.blob.size,
      });

      // Update remaining downloads
      setFetchedShareInfo((prev) =>
        prev ? { ...prev, downloads_remaining: dlRes.downloadsRemaining } : null
      );
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      if (status === 401) {
        setAccessError('AUTHENTICATION FAILED: Incorrect password. The server never stores your password.');
      } else {
        setAccessError(err.response?.data?.detail || 'Decryption failed.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const copyShareLink = (shareId: string) => {
    const url = `${window.location.origin}/#share=${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Tabs */}
      <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            Zero-Knowledge Ephemeral File Sharing
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            End-to-End Cryptographic Access Control & Burn-After-Reading Storage
          </p>
        </div>

        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-cyber-border">
          <button
            type="button"
            onClick={() => setActiveSubTab('create')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeSubTab === 'create'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Secure Drop
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('access')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeSubTab === 'access'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Access / Decrypt Drop
          </button>
        </div>
      </div>

      {activeSubTab === 'create' ? (
        /* CREATE DROP VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyber-border hover:border-cyan-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-cyber-card/60 hover:bg-cyber-card group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFileToShare(e.target.files[0]);
                    setCreateError(null);
                    setCreatedShare(null);
                  }
                }}
                className="hidden"
              />
              <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/80 group-hover:bg-cyan-500/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors border border-cyber-border group-hover:border-cyan-500/40">
                <Upload className="w-6 h-6" />
              </div>

              <p className="mt-3 text-sm font-medium text-slate-200">
                {fileToShare ? fileToShare.name : 'Select file to encrypt & share'}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-mono">
                Payload is encrypted client/server with AES-256-GCM before storage. Server never stores the key.
              </p>
            </div>

            {/* Sharing Controls & Expiry */}
            <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expiration Hours */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Auto-Expiry Time
                  </label>
                  <select
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none"
                  >
                    <option value={1}>1 Hour (Strict Ephemeral)</option>
                    <option value={6}>6 Hours</option>
                    <option value={24}>24 Hours (Standard)</option>
                    <option value={72}>3 Days</option>
                    <option value={168}>7 Days (Maximum)</option>
                  </select>
                </div>

                {/* Max Downloads */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Max Downloads (Burn Limit)
                  </label>
                  <select
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none"
                  >
                    <option value={1}>1 Download (Burn After Reading)</option>
                    <option value={3}>3 Downloads</option>
                    <option value={5}>5 Downloads</option>
                    <option value={10}>10 Downloads</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Passphrase for Recipient</span>
                  <span className="text-emerald-400 text-[10px]">Zero Server Knowledge</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Enter passphrase to lock this file..."
                    className="w-full bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 font-mono outline-none"
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
                <PasswordStrength password={sharePassword} />
              </div>

              {createError && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateShare}
                disabled={isCreating || !fileToShare || !sharePassword}
                className={`w-full py-3 px-4 rounded-lg font-mono text-sm font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                  isCreating || !fileToShare || !sharePassword
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-cyber-border'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                }`}
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Encrypting & Generating Secure Share Token...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Create Secure Ephemeral Drop
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Generated Share Link & Security Model */}
          <div className="space-y-6">
            {createdShare ? (
              <div className="bg-gradient-to-br from-cyber-card to-cyan-950/30 p-5 rounded-xl border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.25)] space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold">
                  <CheckCircle className="w-5 h-5" />
                  Secure Drop Active
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-900/80 border border-cyber-border">
                    <span className="text-slate-400 text-[11px] block">Cryptographic Share ID:</span>
                    <span className="text-cyan-300 break-all text-[11px] font-mono">{createdShare.share_id}</span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900/80 border border-cyber-border space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Max Downloads:</span>
                      <span className="text-slate-200">{createdShare.max_downloads} (Burn on limit)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Expires:</span>
                      <span className="text-slate-200">{new Date(createdShare.expires_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyShareLink(createdShare.share_id)}
                    className="w-full py-2.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedLink ? 'Copied Secure Link!' : 'Copy Share Token'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-3 font-mono text-xs text-slate-400">
                <h3 className="text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Zero-Knowledge Security Architecture
                </h3>
                <p className="leading-relaxed">
                  Only the encrypted AES-256-GCM ciphertext blob is stored on the server.
                </p>
                <div className="p-3 rounded bg-slate-900/60 border border-cyber-border space-y-2">
                  <div className="text-slate-200 font-semibold">Automatic Purge Guarantees:</div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Files are securely wiped from disk once download limits are reached.</li>
                    <li>Expired drops are purged automatically.</li>
                    <li>Decryption passwords are never transmitted unencrypted or recorded.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ACCESS / DECRYPT DROP VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Input Share ID */}
            <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Enter Share Token / ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessShareId}
                    onChange={(e) => setAccessShareId(e.target.value.trim())}
                    placeholder="Paste the 32-character share token..."
                    className="flex-1 bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleFetchShareInfo}
                    disabled={isFetchingInfo || !accessShareId}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
                  >
                    {isFetchingInfo ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Inspect Drop
                  </button>
                </div>
              </div>

              {accessError && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{accessError}</span>
                </div>
              )}

              {fetchedShareInfo && (
                <div className="pt-4 border-t border-cyber-border space-y-4">
                  <div className="p-4 rounded-lg bg-slate-900/80 border border-cyber-border font-mono text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Target File:</span>
                      <span className="text-cyan-300 font-semibold">{fetchedShareInfo.original_filename}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Downloads Remaining:</span>
                      <span className="text-emerald-400 font-semibold">{fetchedShareInfo.downloads_remaining}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Expires:</span>
                      <span className="text-slate-300">{new Date(fetchedShareInfo.expires_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Password & Decrypt */}
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                      Enter Decryption Passphrase
                    </label>
                    <div className="relative">
                      <input
                        type={showDownloadPassword ? 'text' : 'password'}
                        value={downloadPassword}
                        onChange={(e) => setDownloadPassword(e.target.value)}
                        placeholder="Passphrase provided by sender..."
                        className="w-full bg-slate-900/90 border border-cyber-border focus:border-cyan-500 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-200 font-mono outline-none"
                      />
                      <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowDownloadPassword(!showDownloadPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showDownloadPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadAndDecrypt}
                    disabled={isDownloading || !downloadPassword}
                    className="w-full py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Fetching & Decrypting Drop...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download & Authenticate Drop
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Claimed File Download Card */}
          <div className="space-y-6">
            {decryptedFileUrl ? (
              <div className="bg-gradient-to-br from-cyber-card to-emerald-950/20 p-5 rounded-xl border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)] space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold">
                  <CheckCircle className="w-5 h-5" />
                  Drop Decrypted & Verified
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">File Name:</span>
                    <div className="text-slate-100 font-bold truncate mt-0.5">{decryptedFileUrl.filename}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Size:</span>
                    <div className="text-slate-200">{(decryptedFileUrl.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>

                <a
                  href={decryptedFileUrl.url}
                  download={decryptedFileUrl.filename}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Save File to Device
                </a>
              </div>
            ) : (
              <div className="bg-cyber-card p-5 rounded-xl border border-cyber-border space-y-3 font-mono text-xs text-slate-400">
                <h3 className="text-cyan-400 uppercase tracking-wider font-semibold">Recipient Verification</h3>
                <p>
                  To receive a secure file, enter the token provided by the sender. You will then enter the shared passphrase to authenticate and decrypt the payload directly in your browser.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
