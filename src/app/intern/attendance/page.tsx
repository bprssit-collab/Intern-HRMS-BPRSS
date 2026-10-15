'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GeofenceChecker } from '@/components/geofence-checker';
import { FaceCapture } from '@/components/face-capture';
import { compareFaceDescriptors } from '@/lib/face-api';
import type { GeoPosition, Settings, User } from '@/types';
import { AlertCircle, CheckCircle, Clock, RotateCcw } from 'lucide-react';

export default function AttendancePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [step, setStep] = useState<'geofence' | 'face' | 'done'>('geofence');
  const [locationData, setLocationData] = useState<{pos: GeoPosition, distance: number} | null>(null);

  // Initialize data
  useEffect(() => {
    async function init() {
      try {
        // Fetch user, settings, and today's attendance in parallel with no cache
        const [userRes, settingsRes, historyRes] = await Promise.all([
          fetch('/api/users/me', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' }),
          fetch('/api/attendance/my-history?limit=1', { cache: 'no-store' })
        ]);
        
        const userData = await userRes.json();
        const settingsData = await settingsRes.json();
        const historyData = await historyRes.json();
        
        if (!userData.success || !userData.data.face_descriptor) {
          router.push('/intern/register-face');
          return;
        }
        
        setUserProfile(userData.data);
        setSettings(settingsData.data);
        
        // Check if already checked in today
        const todayStr = new Date().toISOString().split('T')[0];
        const latestRecord = historyData.data?.[0];
        
        if (latestRecord && latestRecord.date === todayStr) {
          setHasCheckedIn(!!latestRecord.check_in_time);
          setHasCheckedOut(!!latestRecord.check_out_time);
          
          if (latestRecord.check_out_time) {
            setStep('done');
          }
        }
        
      } catch (err: any) {
        setError('Gagal memuat data. Silakan refresh halaman.');
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, [router]);

  const handleLocationValid = (pos: GeoPosition, distance: number) => {
    setLocationData({ pos, distance });
    // Small delay for UX so user sees the "Valid" message before switching
    setTimeout(() => setStep('face'), 1500);
  };

  const handleFaceCaptured = async (descriptor: number[]): Promise<{ success: boolean; message?: string }> => {
    if (!userProfile?.face_descriptor) {
      return {
        success: false,
        message: 'Data wajah Anda belum terdaftar di sistem. Silakan buka menu Data Wajah untuk melakukan pendaftaran.',
      };
    }
    
    if (!locationData) {
      return {
        success: false,
        message: 'Lokasi kantor belum tervalidasi. Silakan ulangi pengecekan GPS.',
      };
    }
    
    // Compare face client-side
    const matchResult = compareFaceDescriptors(
      new Float32Array(descriptor), 
      userProfile.face_descriptor
    );
    
    if (!matchResult.matched) {
      return {
        success: false,
        message: matchResult.message,
      };
    }
    
    // Face matched! Proceed to submit to API
    try {
      const endpoint = hasCheckedIn ? '/api/attendance/checkout' : '/api/attendance/checkin';
      const body = hasCheckedIn ? {} : {
        lat: locationData.pos.lat,
        long: locationData.pos.long,
        distance_from_office: locationData.distance
      };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error || 'Gagal merekam absensi ke server.',
        };
      }
      
      // Mark step as done after brief delay so user sees verified state
      setTimeout(() => {
        setStep('done');
      }, 1500);
      
      // Redirect back to dashboard
      setTimeout(() => {
        router.push('/intern/dashboard');
        router.refresh();
      }, 3500);

      return {
        success: true,
        message: json.message || 'Absensi berhasil direkam!',
      };
      
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Terjadi kesalahan jaringan saat mengirim data absensi.',
      };
    }
  };

  const handleResetToday = async () => {
    if (!confirm('Apakah Anda ingin mereset data absensi hari ini untuk uji coba lagi?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/attendance/reset-today', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mereset absensi.');
      }
      setHasCheckedIn(false);
      setHasCheckedOut(false);
      setLocationData(null);
      setStep('geofence');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 sm:pl-56">
        <div className="spinner !w-10 !h-10 mb-4"></div>
        <p className="text-slate-400">Memuat data absensi...</p>
      </div>
    );
  }

  if (!userProfile?.face_descriptor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 sm:pl-56">
        <div className="spinner !w-8 !h-8 mb-4"></div>
        <p className="text-slate-300">Wajah belum terdaftar. Mengalihkan ke pendaftaran wajah...</p>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="sm:pl-56">
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          {error || 'Gagal memuat pengaturan kantor. Silakan refresh halaman.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:pl-56 animate-fade-in">
      <div className="glass-card p-6 mb-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1 text-white">
            {hasCheckedOut ? 'Absensi Selesai' : hasCheckedIn ? 'Absen Keluar' : 'Absen Masuk'}
          </h2>
          <p className="text-slate-400 text-sm">
            Validasi lokasi GPS dan verifikasi wajah.
          </p>
        </div>
        <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 border border-blue-500/20">
          <Clock className="w-5 h-5" />
          <span className="font-mono font-medium">{new Date().toLocaleTimeString('id-ID')}</span>
        </div>
      </div>

      <div className="relative">
        {/* Step Indicators */}
        {step !== 'done' && (
          <div className="flex justify-center mb-8 gap-4">
            <div className={`flex items-center gap-2 ${step === 'geofence' ? 'text-emerald-400' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'geofence' ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-500'}`}>1</div>
              <span className="text-sm font-medium hidden sm:inline">Lokasi</span>
            </div>
            <div className="w-8 border-t-2 border-slate-700 my-auto"></div>
            <div className={`flex items-center gap-2 ${step === 'face' ? 'text-emerald-400' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'face' ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-500'}`}>2</div>
              <span className="text-sm font-medium hidden sm:inline">Wajah</span>
            </div>
          </div>
        )}

        {/* Dynamic Step Content */}
        {step === 'done' ? (
          <div className="glass-card border-emerald-500/50 bg-emerald-950/20 p-8 text-center flex flex-col items-center mt-10">
            <div className="p-4 bg-emerald-500/20 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="font-bold text-xl text-emerald-400 mb-2">
              {hasCheckedOut ? 'Absensi Hari Ini Selesai' : 'Absen Masuk Berhasil'}
            </h3>
            <p className="text-slate-300 mb-6">
              {hasCheckedOut 
                ? 'Terima kasih atas kerja keras Anda hari ini.' 
                : 'Selamat bekerja! Jangan lupa absen keluar nanti.'}
            </p>

            <div className="pt-6 border-t border-white/10 w-full max-w-sm">
              <button
                type="button"
                onClick={handleResetToday}
                disabled={isResetting}
                className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 mx-auto transition-all w-full disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {isResetting ? 'Mereset Data Absensi...' : 'Uji Coba Absensi Lagi (Reset Absen Hari Ini)'}
              </button>
              <p className="text-[11px] text-slate-500 mt-2">
                Tombol mode pengujian agar Anda dapat mencoba alur presensi GPS & Wajah berulang kali.
              </p>
            </div>
          </div>
        ) : step === 'geofence' ? (
          <GeofenceChecker 
            officePos={{ lat: settings.office_lat, long: settings.office_long }}
            maxRadius={settings.max_radius_meters}
            onValid={handleLocationValid}
          />
        ) : (
          <div className="glass-card p-6">
            <FaceCapture 
              title={hasCheckedIn ? "Verifikasi Absen Keluar" : "Verifikasi Absen Masuk"}
              buttonText={hasCheckedIn ? "Kirim Absen Keluar" : "Kirim Absen Masuk"}
              onCapture={handleFaceCaptured}
            />
          </div>
        )}
      </div>
    </div>
  );
}
