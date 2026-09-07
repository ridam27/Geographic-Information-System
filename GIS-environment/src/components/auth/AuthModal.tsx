import React, { useState } from 'react';
import { Shield, Lock, User, LogOut, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('admin@company.com');
  const [role, setRole] = useState<UserRole>('ORG_ADMIN');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      login(email, role);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Enterprise Authentication & Identity
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {isAuthenticated ? (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 font-extrabold text-sm">
                    {user?.name.slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-white text-sm">{user?.name}</span>
                    <span className="text-slate-400 text-[11px]">{user?.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] font-mono">
                  <span className="text-slate-400">Organization</span>
                  <span className="text-sky-300 font-bold">{user?.organizationName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">RBAC Role</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                    {user?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-bold flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" /> Sign Out Session
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" /> Enterprise Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" /> Select Role (RBAC Simulation)
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-sky-500 font-mono"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ORG_ADMIN">Organization Admin</option>
                  <option value="WEATHER_ANALYST">Weather Analyst</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all mt-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
