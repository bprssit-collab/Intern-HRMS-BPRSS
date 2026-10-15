'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaceCapture } from '@/components/face-capture';
import { AlertCircle, CheckCircle, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RegisterFacePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch('/api/users/me');
        const json = await res.json();
        if (json.success && json.data) {
          const desc = json.data.face_descriptor;
          if (Array.isArray(desc) && desc.length > 0) {
            setAlreadyRegistered(true);
          }
        }
      } catch (err) {
        console.error('Error checking profile:', err);
      } finally {
        setIsCheckingProfile(false);
      }
    }
    checkProfile();
  }, []);

  const handleFaceCaptured = async (descriptor: number[]): Promise<{ success: boolean; message?: string }> => {
    setStatus('submitting');
    
    try {
      const res = await fetch('/api/users/register-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ face_descriptor: descriptor }),
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        setStatus('error');
        setMessage(json.error || 'Gagal mendaftarkan wajah.');
        return { success: false, message: json.error || 'Gagal mendaftarkan wajah.' };
      }
      
      setStatus('success');
      setMessage(json.message);
      
      // Hard reload redirect so dashboard and attendance fetch fresh profile
      setTimeout(() => {
        window.location.href = '/intern/dashboard';
      }, 1500);

      return { success: true };
      
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Terjadi kesalahan server.');
      return { success: false, message: err.message || 'Terjadi kesalahan server.' };
    }
  };

  if (isCheckingProfile) {
    return (
      <div className="space-y-6 sm:pl-56 animate-fade-in flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Memeriksa status pendaftaran wajah...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:pl-56 animate-fade-in">
      <div className="glass-card p-6 mb-6 text-center md:text-left">
        <h2 className="text-xl font-bold mb-2 text-white flex items-center gap-2">
          <span>Pendaftaran Wajah Interaktif</span>
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          Perekaman biometrik presisi dengan 3 langkah sudut: <strong>1. Hadap Depan</strong>, <strong>2. Sedikit Menoleh Samping</strong>, dan <strong>3. Konfirmasi Depan</strong>. Posisikan wajah sesuai panduan hingga hitungan selesai pada tiap langkah.
        </p>
      </div>

      {alreadyRegistered ? (
        <div className="glass-card border-amber-500/40 bg-amber-950/20 p-8 text-center flex flex-col items-center">
          <div className="p-4 bg-amber-500/20 rounded-full mb-4 border border-amber-500/40">
            <ShieldAlert className="w-12 h-12 text-amber-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">Wajah Sudah Didaftarkan</h3>
          <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
            Wajah sudah didaftarkan, jika ingin merubah silahkan hubungi admin.
          </p>
          <Link
            href="/intern/dashboard"
            className="btn-primary text-xs flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </Link>
        </div>
      ) : status === 'success' ? (
        <div className="glass-card border-emerald-500/50 bg-emerald-950/20 p-8 text-center flex flex-col items-center">
          <div className="p-4 bg-emerald-500/20 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          <h3 className="font-bold text-lg text-emerald-400 mb-2">Pendaftaran Berhasil!</h3>
          <p className="text-slate-300 mb-6">{message}</p>
          <div className="spinner !w-6 !h-6"></div>
          <p className="text-xs text-slate-500 mt-4">Mengalihkan ke dashboard...</p>
        </div>
      ) : (
        <div className="glass-card p-6">
          {status === 'error' && (
            <div className="alert alert-error mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{message}</span>
            </div>
          )}
          
          <FaceCapture 
            title="Pindai Wajah Anda" 
            buttonText="Simpan Data Wajah"
            mode="register"
            successMessage="Wajah Berhasil Direkam"
            onCapture={handleFaceCaptured} 
          />
          
          {status === 'submitting' && (
            <div className="mt-4 text-center text-blue-400 text-sm flex items-center justify-center gap-2">
              <div className="spinner !w-4 !h-4"></div>
              Menyimpan data ke server...
            </div>
          )}
        </div>
      )}
      
      {!alreadyRegistered && (
        <div className="text-center mt-6">
          <Link href="/intern/dashboard" className="text-sm text-slate-500 hover:text-slate-300">
            Kembali ke Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
