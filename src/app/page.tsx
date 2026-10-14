'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Login gagal.');
      }

      // Hard redirect based on role to ensure cookies are sent on mobile devices
      if (json.data.role === 'hrd' || json.data.role === 'super_admin') {
        window.location.href = '/hrd/dashboard';
      } else {
        window.location.href = '/intern/dashboard';
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="nama@bprsehat.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="••••••••"
              />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setEmail('superadmin@bprsehat.com');
                setPassword('admin123');
              }}
              className="px-2.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/40 border border-purple-500/30 rounded-lg text-left transition-all group"
            >
              <span className="block font-semibold text-purple-300 group-hover:underline">⚡ Super Admin</span>
              <span className="text-[10px] text-slate-400 truncate block">superadmin@bpr...</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('hrd@bprsehat.com');
                setPassword('admin123');
              }}
              className="px-2.5 py-2 bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 rounded-lg text-left transition-all group"
            >
              <span className="block font-medium text-emerald-400 group-hover:underline">👑 Admin HRD</span>
              <span className="text-[10px] text-slate-400 truncate block">hrd@bprsehat...</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('budi@intern.bprsehat.com');
                setPassword('intern123');
              }}
              className="px-2.5 py-2 bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/40 border border-white/10 rounded-lg text-left transition-all group"
            >
              <span className="block font-medium text-blue-400 group-hover:underline">🎓 Intern Budi</span>
              <span className="text-[10px] text-slate-400 truncate block">budi@intern...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
