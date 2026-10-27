import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface IntegrityResult {
  filename: string;
  file_size: number;
  hashes: {
    sha256: string;
    sha512: string;
    sha1: string;
    md5: string;
  };
  matches_expected: boolean | null;
  expected_sha256: string | null;
  message: string;
}

export interface ShareInfo {
  share_id: string;
  original_filename: string;
  file_size: number;
  created_at: string;
  expires_at: string;
  downloads_remaining: number;
  is_active: boolean;
  is_expired: boolean;
}

export interface AuditRecord {
  id: number;
  timestamp: string;
  action: string;
  filename: string;
  file_size: number;
  status: string;
  details: string | null;
  sha256_hash: string | null;
}

export interface SystemStatus {
  platform: string;
  version: string;
  encryption_algorithm: string;
  key_derivation: string;
  integrity_hashing: string;
  salt_entropy_bytes: number;
  nonce_entropy_bytes: number;
  zero_knowledge_storage: boolean;
  active_shares: number;
  total_audited_events: number;
}

// 1. Single file encryption
export async function encryptFileApi(file: File, password: string): Promise<{ blob: Blob; filename: string; sha256: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);

  const res = await api.post('/encrypt/file', formData, {
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'] || '';
  let filename = `${file.name}.svx`;
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }

  const sha256 = res.headers['x-original-sha256'] || '';

  return { blob: res.data, filename, sha256 };
}

// 2. Multi-file archive encryption
export async function encryptArchiveApi(files: File[], password: string, archiveName?: string): Promise<{ blob: Blob; filename: string; sha256: string; memberCount: number }> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  formData.append('password', password);
  if (archiveName) {
    formData.append('archive_name', archiveName);
  }

  const res = await api.post('/encrypt/archive', formData, {
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'] || '';
  let filename = `${archiveName || 'secure_vault_archive'}.zip.svxa`;
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }

  const sha256 = res.headers['x-original-sha256'] || '';
  const memberCount = parseInt(res.headers['x-member-count'] || String(files.length), 10);

  return { blob: res.data, filename, sha256, memberCount };
}

// 3. Decrypt file or archive
export async function decryptFileApi(file: File, password: string): Promise<{ blob: Blob; originalFilename: string; sha256: string; isArchive: boolean }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);

  const res = await api.post('/decrypt/file', formData, {
    responseType: 'blob',
  });

  let originalFilename = res.headers['x-original-filename'] || 'decrypted_file';
  const sha256 = res.headers['x-decrypted-sha256'] || '';
  const isArchive = res.headers['x-is-archive'] === 'true';

  return { blob: res.data, originalFilename, sha256, isArchive };
}

// 4. Integrity check
export async function verifyHashApi(file: File, expectedSha256?: string): Promise<IntegrityResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (expectedSha256) {
    formData.append('expected_sha256', expectedSha256.trim());
  }

  const res = await api.post<IntegrityResult>('/verify/hash', formData);
  return res.data;
}

// 5. Tamper simulation demonstration
export async function tamperSimulationApi(file: File, byteIndex: number = 0) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('byte_index', String(byteIndex));

  const res = await api.post('/verify/tamper-demo', formData);
  return res.data;
}

// 6. Create secure ephemeral share
export async function createShareApi(
  file: File,
  password?: string,
  isAlreadyEncrypted: boolean = false,
  expiryHours: number = 24,
  maxDownloads: number = 1
) {
  const formData = new FormData();
  formData.append('file', file);
  if (password) formData.append('password', password);
  formData.append('is_already_encrypted', String(isAlreadyEncrypted));
  formData.append('expiry_hours', String(expiryHours));
  formData.append('max_downloads', String(maxDownloads));

  const res = await api.post('/share/create', formData);
  return res.data;
}

// 7. Get share info
export async function getShareInfoApi(shareId: string): Promise<ShareInfo> {
  const res = await api.get<ShareInfo>(`/share/${shareId}/info`);
  return res.data;
}

// 8. Download shared container
export async function downloadSharedFileApi(shareId: string): Promise<{ blob: Blob; filename: string; downloadsRemaining: number }> {
  const res = await api.get(`/share/${shareId}/download`, {
    responseType: 'blob',
  });

  const disposition = res.headers['content-disposition'] || '';
  let filename = 'secure_shared_file.svx';
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }
  const downloadsRemaining = parseInt(res.headers['x-downloads-remaining'] || '0', 10);

  return { blob: res.data, filename, downloadsRemaining };
}

// 9. Revoke share
export async function revokeShareApi(shareId: string) {
  const res = await api.delete(`/share/${shareId}`);
  return res.data;
}

// 10. Audit logs & status
export async function getAuditLogsApi(limit: number = 50): Promise<AuditRecord[]> {
  const res = await api.get<AuditRecord[]>(`/audit/logs?limit=${limit}`);
  return res.data;
}

export async function getSystemStatusApi(): Promise<SystemStatus> {
  const res = await api.get<SystemStatus>('/audit/status');
  return res.data;
}

export async function clearAuditLogsApi() {
  const res = await api.delete('/audit/logs');
  return res.data;
}
