'use client';

import { useEffect, useRef, useState } from 'react';
import { loadFaceApiModels, getFaceDescriptor, descriptorToArray } from '@/lib/face-api';
import { Camera, CheckCircle, RefreshCcw, AlertTriangle, UserX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface FaceCaptureProps {
  onCapture: (descriptor: number[]) => Promise<{ success: boolean; message?: string } | void> | void;
  title?: string;
  buttonText?: string;
  mode?: 'register' | 'verify';
  successMessage?: string;
}

export function FaceCapture({ 
  onCapture, 
  title = "Verifikasi Wajah", 
  buttonText = "Ambil Foto",
  mode = "verify",
  successMessage
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize camera and models on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setIsInitializing(true);
        // Load AI models
        await loadFaceApiModels();
        
        if (!mounted) return;

        // Request camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera init error:', err);
        setError('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera pada peramban/browser.');
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }

    initialize();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    
    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      
      if (!descriptor) {
        setError('Wajah tidak terdeteksi dalam kamera. Pastikan wajah terlihat jelas, menghadap lurus, dan berada di ruangan dengan pencahayaan terang.');
        setIsProcessing(false);
        return;
      }
      
      const descriptorArray = descriptorToArray(descriptor);
      
      // Pass to parent and await result
      const result = await onCapture(descriptorArray);
      
      if (result && typeof result === 'object' && result.success === false) {
        // Verification or registration failed!
        setSuccess(false);
        setError(result.message || 'Wajah tidak cocok dengan data pendaftaran.');
      } else {
        // Verification or registration succeeded!
        setSuccess(true);
        setError(null);
      }
      
    } catch (err: any) {
      console.error('Capture error:', err);
      setSuccess(false);
      setError(err?.message || 'Terjadi kesalahan saat memproses data wajah.');
    } finally {
      setIsProcessing(false);
    }
  };

  const retry = () => {
    setSuccess(false);
    setError(null);
  };

  const handleSimulateFace = async () => {
    // Generate deterministic 128-float unit descriptor for testing
    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    try {
      const synthetic = Array.from({ length: 128 }, (_, i) => Math.sin(i) * 0.08);
      const result = await onCapture(synthetic);
      if (result && typeof result === 'object' && result.success === false) {
        setSuccess(false);
        setError(result.message || 'Wajah simulasi tidak cocok.');
      } else {
        setSuccess(true);
        setError(null);
      }
    } catch (err: any) {
      setSuccess(false);
      setError(err.message || 'Gagal simulasi');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      
      <div className="camera-viewport mb-4 relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black">
        {isInitializing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-medium">Menyiapkan Kamera & AI Wajah...</p>
          </div>
        ) : error && !streamRef.current ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-red-400 p-6 text-center z-20">
            <AlertTriangle className="w-10 h-10 mb-3 text-red-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : null}
        
        {/* Video stream */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={cn(
            'w-full h-full object-cover transition-all duration-300',
            success && 'opacity-60 grayscale'
          )}
        />
        
        {/* Hidden canvas for processing if needed */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Decorative corner markers during live scan */}
        {!success && !isInitializing && !error && (
          <div className="camera-overlay pointer-events-none">
            <div className="corner corner-tl border-emerald-400"></div>
            <div className="corner corner-tr border-emerald-400"></div>
            <div className="corner corner-bl border-emerald-400"></div>
            <div className="corner corner-br border-emerald-400"></div>
            {isProcessing && (
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
            )}
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
            <p className="text-white text-sm font-semibold">
              {mode === 'verify' ? 'Memverifikasi Wajah...' : 'Merekam Data Wajah...'}
            </p>
          </div>
        )}

        {/* Success Overlay (ONLY rendered when verification actually succeeded) */}
        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/40 backdrop-blur-sm z-20 animate-fade-in">
            <div className="bg-emerald-500/20 p-4 rounded-full border border-emerald-500/40 mb-3 shadow-lg shadow-emerald-900/50">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <p className="text-emerald-300 font-bold text-base bg-black/60 px-4 py-1.5 rounded-full border border-emerald-500/30">
              {successMessage || (mode === 'verify' ? 'Wajah Cocok & Terverifikasi' : 'Wajah Berhasil Direkam')}
            </p>
          </div>
        )}
      </div>

      {/* Error Message Box */}
      {error && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 mb-4 w-full text-left animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-red-300 uppercase tracking-wider">Verifikasi Gagal</p>
              <p className="text-xs text-red-200 leading-relaxed">{error}</p>
              {mode === 'verify' && (
                <div className="pt-2">
                  <Link 
                    href="/intern/register-face" 
                    className="text-xs text-amber-300 hover:text-amber-200 underline font-medium flex items-center gap-1"
                  >
                    Wajah Anda belum terdaftar atau berubah? Klik untuk Daftar Ulang Wajah →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      {success ? (
        <button 
          type="button" 
          onClick={retry}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" /> Ambil Foto Lagi
        </button>
      ) : (
        <div className="w-full space-y-2.5">
          <button 
            type="button" 
            onClick={handleCapture}
            disabled={isInitializing || isProcessing || !streamRef.current}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base shadow-lg shadow-emerald-950/50 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses Wajah...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>{buttonText}</span>
              </>
            )}
          </button>
          
          {/* Fallback simulation button for testing if webcam is unavailable or in demo */}
          {(!streamRef.current || error) && !isInitializing && (
            <button
              type="button"
              onClick={handleSimulateFace}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl text-xs font-medium transition-colors"
            >
              📸 Uji Coba dengan Data Wajah Simulasi (Testing Mode)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
