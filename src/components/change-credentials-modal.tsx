'use client';

import { useState, useEffect } from 'react';
import { KeyRound, Lock, User as UserIcon, CheckCircle, AlertCircle, Eye, EyeOff, Sparkles, Loader2, Info } from 'lucide-react';

interface ChangeCredentialsModalProps {
  initialMustChange?: boolean;
  currentUser?: {
    id: string;
    name: string;
    username: string;
    must_change_credentials?: boolean;
  };
}

export function ChangeCredentialsModal({ initialMustChange, currentUser }: ChangeCredentialsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ id: string; name: string; username: string } | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Check if user must change credentials
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.must_change_credentials) {
            setUserInfo(json.data);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to check credentials status:', err);
      }
    };

    if (initialMustChange !== undefined) {
      if (initialMustChange && currentUser) {
        setUserInfo(currentUser);
        setIsOpen(true);
      }
    } else {
      checkStatus();
    }
  }, [initialMustChange, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = newUsername.trim().toLowerCase();

    // 1. Format validation
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setError('Username harus terdiri dari 3 sampai 30 karakter.');
      return;
    }

    if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
      setError('Username hanya boleh huruf kecil, angka, titik (.), atau garis bawah (_).');
      return;
    }

    // 2. Cannot keep the default/current username
    const currentUsername = (userInfo?.username || '').trim().toLowerCase();
    if (currentUsername && cleanUsername === currentUsername) {
      setError(`Username baru tidak boleh sama dengan username bawaan (${userInfo?.username}). Silakan tentukan username baru Anda.`);
      return;
    }

    // 3. Password length
    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }

    // 4. Cannot use default password
    if (newPassword.toLowerCase() === 'magang2026') {
      setError('Password baru tidak boleh menggunakan password default (magang2026). Silakan buat password baru yang aman.');
      return;
    }

    // 5. Username and password cannot be identical
    if (cleanUsername === newPassword.toLowerCase()) {
      setError('Username dan password baru tidak boleh bernilai sama demi keamanan akun Anda.');
      return;
    }

    // 6. Confirm password must match
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_username: cleanUsername,
          new_password: newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui username & password.');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-7 border-emerald-500/40 shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Kredensial Berhasil Diperbarui!</h3>
            <p className="text-sm text-slate-300">
              Username dan password baru Anda telah aktif. Membuka dashboard absensi...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Aktivasi Akun Magang</h2>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    WAJIB
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Halo, <strong>{userInfo?.name || 'Anak Magang'}</strong>! Silakan buat kredensial baru Anda.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 mb-4 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>
                Akun Anda saat ini menggunakan kredensial bawaan. Untuk keamanan, Anda <strong>wajib mengganti Username dan Password baru yang berbeda</strong> sebelum dapat melanjutkan.
              </span>
            </div>

            {userInfo?.username && (
              <div className="mb-4 p-2.5 rounded-lg bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Username bawaan saat ini:</span>
                <span className="font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {userInfo.username}
                </span>
              </div>
            )}

            {error && (
              <div className="alert alert-error mb-4 text-xs py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Baru */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 ml-0.5 flex items-center justify-between">
                  <span>Username Baru</span>
                  <span className="text-[10px] text-slate-500 font-normal">Huruf kecil, angka, titik, _</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder={`Contoh: ${userInfo?.username ? userInfo.username + '1' : 'budi.santoso'}`}
                    className="input-field text-sm !pl-9"
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>
              </div>

              {/* Password Baru */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 ml-0.5 flex items-center justify-between">
                  <span>Password Baru</span>
                  <span className="text-[10px] text-slate-500 font-normal">Minimal 6 karakter, beda dari username</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field text-sm !pl-9 !pr-10"
                    style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 ml-0.5">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field text-sm !pl-9"
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Kredensial...</span>
                    </>
                  ) : (
                    <span>Simpan & Lanjutkan ke Dashboard</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
