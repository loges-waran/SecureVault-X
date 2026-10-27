import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  Lock, 
  CheckCircle, 
  XCircle, 
  Server,
  Layers,
  Database
} from 'lucide-react';
import { 
  getAuditLogsApi, 
  getSystemStatusApi, 
  clearAuditLogsApi, 
  AuditRecord, 
  SystemStatus 
} from '../services/api';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logsData, statusData] = await Promise.all([
        getAuditLogsApi(100),
        getSystemStatusApi(),
      ]);
      setLogs(logsData);
      setStatus(statusData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear the audit history?')) {
      try {
        await clearAuditLogsApi();
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter === 'ALL') return true;
    return log.action.includes(actionFilter);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Security Audit Trail & Platform Architecture
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Immutable Audit Trail & Zero-Knowledge Cryptographic Parameters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyber-border text-xs font-mono text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* System Status Metrics Grid */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Cipher Spec</span>
              <Lock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">AES-256-GCM</div>
            <div className="text-[10px] text-slate-500 font-mono">256-bit Key / 128-bit Tag</div>
          </div>

          <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Key Derivation</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">Scrypt (N=16384)</div>
            <div className="text-[10px] text-slate-500 font-mono">r=8, p=1 (Memory-hard)</div>
          </div>

          <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Entropy & Nonces</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">16B Salt / 12B Nonce</div>
            <div className="text-[10px] text-slate-500 font-mono">CSPRNG os.urandom</div>
          </div>

          <div className="p-4 rounded-xl bg-cyber-card border border-cyber-border space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Audit Storage</span>
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">SQLite (Zero-Secret)</div>
            <div className="text-[10px] text-slate-500 font-mono">
              {status.total_audited_events} Total Events Logged
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-cyber-card rounded-xl border border-cyber-border overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-cyber-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold uppercase text-slate-200">
              Audit Event Log
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              {filteredLogs.length} Records
            </span>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Filter:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-900 border border-cyber-border rounded px-2.5 py-1 text-slate-200 text-xs outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="ENCRYPT">Encryption</option>
              <option value="DECRYPT">Decryption</option>
              <option value="VERIFY">Integrity Verification</option>
              <option value="SHARE">Secure Share</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900/80 text-slate-400 text-[11px] uppercase border-b border-cyber-border">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No audit records recorded yet. Encrypt or verify a file to populate.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-cyber-border text-cyan-300 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200 max-w-[180px] truncate">
                      {log.filename}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {(log.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" /> SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[280px] truncate text-[11px]">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
