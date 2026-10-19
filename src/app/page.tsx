'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Login gagal.');
      }

      // Hard redirect based on role to ensure cookies are sent on mobile devices
      if (json.data.role === 'intern') {
        window.location.href = '/intern/dashboard';
      } else {
        window.location.href = '/hrd/dashboard';
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]"></div>

      <div className="glass-card w-full max-w-md p-8 relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">PT BPR Sehat Sejahtera</h1>
          <p className="text-slate-400">Portal Absensi & Uang Saku Intern</p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field has-icon !pl-12"
                style={{ paddingLeft: '3rem' }}
                placeholder="Contoh: budi.santoso / superadmin"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field has-icon !pl-12 !pr-11"
                style={{ paddingLeft: '3rem', paddingRight: '2.75rem' }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded transition-colors"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-2"
          >
            {isLoading ? (
              <><div className="spinner !w-4 !h-4"></div> Memproses...</>
            ) : (
              <>Masuk <ArrowRight className="w-4 h-4 ml-1" /></>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-300">Akun Demo (Klik untuk Isi Otomatis):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setUsername('superadmin');
                setPassword('admin123');
              }}
              className="px-2.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/40 border border-purple-500/30 rounded-lg text-left transition-all group"
            >
              <span className="block font-semibold text-purple-300 group-hover:underline text-[11px]">⚡ Super Admin</span>
              <span className="text-[10px] text-slate-400 truncate block">superadmin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('kepala.hrd');
                setPassword('kepala123');
              }}
              className="px-2.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-emerald-500/30 rounded-lg text-left transition-all group"
            >
              <span className="block font-medium text-emerald-400 group-hover:underline text-[11px]">👑 Kepala HRD</span>
              <span className="text-[10px] text-slate-400 truncate block">kepala.hrd</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('staf.hrd');
                setPassword('staf123');
              }}
              className="px-2.5 py-2 bg-teal-500/10 hover:bg-teal-500/20 hover:border-teal-500/40 border border-teal-500/30 rounded-lg text-left transition-all group"
            >
              <span className="block font-medium text-teal-300 group-hover:underline text-[11px]">📋 Staf HRD</span>
              <span className="text-[10px] text-slate-400 truncate block">staf.hrd</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('alfiani');
                setPassword('intern123');
              }}
              className="px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/40 border border-amber-500/30 rounded-lg text-left transition-all group"
            >
              <span className="block font-medium text-amber-300 group-hover:underline text-[11px]">💼 Intern HRD</span>
              <span className="text-[10px] text-slate-400 truncate block">alfiani</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('budi');
                setPassword('intern123');
              }}
              className="px-2.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/40 border border-blue-500/30 rounded-lg text-left transition-all group col-span-2 sm:col-span-1"
            >
              <span className="block font-medium text-blue-400 group-hover:underline text-[11px]">🎓 Intern Biasa</span>
              <span className="text-[10px] text-slate-400 truncate block">budi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
