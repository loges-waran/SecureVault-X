import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar, NavTab } from './components/Navbar';
import { EncryptView } from './components/EncryptView';
import { DecryptView } from './components/DecryptView';
import { IntegrityView } from './components/IntegrityView';
import { ShareView } from './components/ShareView';
import { AuditView } from './components/AuditView';
import { Shield, Lock, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('encrypt');
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);

  // Check health and detect URL share token on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get('/api/health', { timeout: 3000 });
        if (res.data?.status === 'healthy') {
          setIsBackendHealthy(true);
        }
      } catch (err) {
        setIsBackendHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    // Check hash for share
    if (window.location.hash.includes('share=')) {
      setActiveTab('share');
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#080d14] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Navbar Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendHealthy={isBackendHealthy}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'encrypt' && <EncryptView />}
        {activeTab === 'decrypt' && <DecryptView />}
        {activeTab === 'integrity' && <IntegrityView />}
        {activeTab === 'share' && <ShareView />}
        {activeTab === 'audit' && <AuditView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-cyber-border bg-[#0a0f18] py-6 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>SecureVault X Platform</span>
            <span>•</span>
            <span className="text-slate-500">NIST SP 800-38D AES-GCM Compliant</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Zero Plaintext Storage
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Scrypt KDF Memory-Hard
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
