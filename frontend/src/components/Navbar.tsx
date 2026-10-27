import React from 'react';
import { Lock, Shield, FileCheck, Share2, Activity } from 'lucide-react';

export type NavTab = 'encrypt' | 'decrypt' | 'integrity' | 'share' | 'audit';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isBackendHealthy: boolean;
}

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab, isBackendHealthy }) => {
  const tabs = [
    { id: 'encrypt', label: 'Encrypt Files', icon: Lock },
    { id: 'decrypt', label: 'Decrypt & Authenticate', icon: Shield },
    { id: 'integrity', label: 'SHA-256 Integrity', icon: FileCheck },
    { id: 'share', label: 'Secure Share', icon: Share2 },
    { id: 'audit', label: 'Security Audit', icon: Activity },
  ];

  return (
    <header className="border-b border-cyber-border bg-[#0a0f18]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/40 text-cyan-400">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-wider text-slate-100 uppercase">
                  Secure<span className="text-cyan-400">Vault</span> <span className="text-emerald-400">X</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                  AES-256-GCM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Military-Grade Authenticated Encryption & Integrity
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex space-x-1 sm:space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as NavTab)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Backend Status Beacon */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="relative flex h-2.5 w-2.5">
              {isBackendHealthy ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </>
              )}
            </span>
            <span className={`text-[11px] hidden sm:inline ${isBackendHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isBackendHealthy ? 'SEC_ACTIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
