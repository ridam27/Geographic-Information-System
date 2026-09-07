import React, { useState } from 'react';
import { Key, Activity, Shield, Trash2, Plus, Copy, Check, X, Server, Database, Brain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminHealthModal: React.FC<AdminHealthModalProps> = ({ isOpen, onClose }) => {
  const { apiKeys, createApiKey, revokeApiKey, auditLogs } = useAuth();
  const [activeTab, setActiveTab] = useState<'apikeys' | 'audit' | 'health'>('apikeys');
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyName.trim()) {
      const created = createApiKey(newKeyName.trim());
      setGeneratedKey(created.fullKey || null);
      setNewKeyName('');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Enterprise Administration & System Health
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('apikeys')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'apikeys'
                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" /> API Key Manager
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'audit'
                ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" /> Audit Logs
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'health'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" /> System Health
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs">
          {activeTab === 'apikeys' && (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleGenerateKey} className="flex gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Key name e.g. Production Weather Ingestion Key"
                  required
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-purple-500 font-mono text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> Generate Key
                </button>
              </form>

              {generatedKey && (
                <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3 flex flex-col gap-1 text-purple-200">
                  <span className="font-bold text-[10px] uppercase font-mono">Newly Created Key (Copy Now!):</span>
                  <div className="flex items-center justify-between font-mono bg-slate-950 p-2 rounded-lg border border-purple-500/30">
                    <span>{generatedKey}</span>
                    <button
                      onClick={() => copyToClipboard(generatedKey, 'gen')}
                      className="p-1 text-purple-300 hover:text-white"
                    >
                      {copiedId === 'gen' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Active API Keys</span>
                {apiKeys.map(k => (
                  <div key={k.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white font-mono">{k.name}</span>
                      <span className="text-slate-400 text-[10px] font-mono">Prefix: {k.keyPrefix}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border font-mono ${
                        k.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {k.status}
                      </span>
                      {k.status === 'ACTIVE' && (
                        <button
                          onClick={() => revokeApiKey(k.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-950/40"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">System Security Audit Trail</span>
              <div className="flex flex-col gap-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 font-bold">{log.action}</span>
                      <span className="text-slate-400">by {log.userName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{log.resource}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-6 h-6 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white">FastAPI Weather Backend</span>
                    <span className="text-slate-400 text-[10px] font-mono">http://localhost:8000</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  HEALTHY (18ms)
                </span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-purple-400" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white">AI Risk Intelligence Engine</span>
                    <span className="text-slate-400 text-[10px] font-mono">Neural Inference Engine</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  ONLINE
                </span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-sky-400" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white">GIS Tile Cache & Storage</span>
                    <span className="text-slate-400 text-[10px] font-mono">Open-Meteo & NASA GIBS</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  SYNCED
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
