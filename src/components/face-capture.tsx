'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  loadFaceApiModels, 
  getFaceDescriptor, 
  descriptorToArray, 
  detectLiveFace,
  type LiveDetectionResult 
} from '@/lib/face-api';
import { 
  Camera, 
  CheckCircle, 
  RefreshCcw, 
  AlertTriangle, 
  Loader2, 
  Sparkles,
  Maximize2,
  Minimize2,
  Move,
  Check,
  Zap
} from 'lucide-react';
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
  buttonText = "Ambil Foto Wajah",
  mode = "verify",
  successMessage
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef(false);
  const optimalTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Real-time live detection state
  const [liveState, setLiveState] = useState<LiveDetectionResult>({
    detected: false,
    status: 'searching',
    message: 'Arahkan wajah ke dalam lingkaran panduan',
    distanceScore: 0,
    faceRatio: 0,
  });

  // Auto-capture countdown: null when inactive, 3.. 2.. 1.. 0
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);

  // Initialize camera and models on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setIsInitializing(true);
        // Load AI models (TinyFaceDetector, Landmarks, FaceNet recognition)
        await loadFaceApiModels();
        
        if (!mounted) return;

        // Request camera with selfie orientation
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user', 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          },
          audio: false
        });
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (mounted && videoRef.current) {
              videoRef.current.play().catch(e => console.warn('Autoplay error:', e));
              startLiveDetectionLoop();
            }
          };
        }
      } catch (err) {
        console.error('Camera init error:', err);
        setError('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera pada peramban/browser.');
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
      stopLiveDetectionLoop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Draw live biometric mesh and laser scan on canvas overlay
  const drawLandmarksAndHUD = useCallback((
    canvas: HTMLCanvasElement, 
    video: HTMLVideoElement, 
    result: LiveDetectionResult
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result.detected && result.landmarks && result.landmarks.length > 0) {
      const isOptimal = result.status === 'optimal';
      const dotColor = isOptimal ? '#10b981' : '#06b6d4';

      // Draw subtle biometric landmark dots (MediaPipe / FaceNet style)
      ctx.fillStyle = dotColor;
      ctx.shadowColor = dotColor;
      ctx.shadowBlur = isOptimal ? 6 : 3;

      for (let i = 0; i < result.landmarks.length; i += 2) {
        const pt = result.landmarks[i];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isOptimal ? 2.2 : 1.6, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw subtle connecting facial mesh contours
      ctx.strokeStyle = isOptimal ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1.2;

      // Jawline (pts 0-16)
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const pt = result.landmarks[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Eyebrows
      ctx.beginPath();
      for (let i = 17; i <= 21; i++) {
        const pt = result.landmarks[i];
        if (i === 17) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 22; i <= 26; i++) {
        const pt = result.landmarks[i];
        if (i === 22) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }, []);

  const optimalDurationRef = useRef(0);
  const hasCapturedRef = useRef(false);
  const handleCaptureRef = useRef<() => void>(() => {});
  const autoCaptureEnabledRef = useRef(true);
  const isProcessingRef = useRef(false);
  const successRef = useRef(false);

  // Sync refs with state on every render
  autoCaptureEnabledRef.current = autoCaptureEnabled;
  isProcessingRef.current = isProcessing;
  successRef.current = success;

  // Main real-time live detection loop (throttled to ~10-15 FPS for silky-smooth performance)
  const startLiveDetectionLoop = useCallback(() => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;

    let lastRunTime = 0;
    const INTERVAL_MS = 100; // run detection every 100ms

    const loop = async (timestamp: number) => {
      if (!isLoopRunningRef.current) return;

      if (
        videoRef.current && 
        videoRef.current.readyState >= 2 && 
        !videoRef.current.paused && 
        !videoRef.current.ended &&
        !isProcessingRef.current &&
        !successRef.current
      ) {
        if (timestamp - lastRunTime >= INTERVAL_MS) {
          lastRunTime = timestamp;
          try {
            const result = await detectLiveFace(videoRef.current);
            setLiveState(result);

            if (canvasRef.current) {
              drawLandmarksAndHUD(canvasRef.current, videoRef.current, result);
            }

            // Reliable loop-driven auto-capture logic
            if (result.status === 'optimal') {
              if (
                autoCaptureEnabledRef.current && 
                !hasCapturedRef.current && 
                !isProcessingRef.current && 
                !successRef.current
              ) {
                optimalDurationRef.current += INTERVAL_MS;
                const TARGET_HOLD_MS = 1200; // 1.2s steady hold in optimal zone

                if (optimalDurationRef.current >= TARGET_HOLD_MS) {
                  hasCapturedRef.current = true;
                  setAutoCaptureCountdown(null);
                  handleCaptureRef.current();
                } else {
                  // Visual countdown: 3 -> 2 -> 1
                  const remainingSec = Math.max(
                    1, 
                    Math.ceil((TARGET_HOLD_MS - optimalDurationRef.current) / 400)
                  );
                  setAutoCaptureCountdown(remainingSec);
                }
              }
            } else {
              // Reset countdown immediately if face slips out of optimal bounds
              optimalDurationRef.current = 0;
              setAutoCaptureCountdown(null);
            }
          } catch (e) {
            // Ignore temporary frame glitch
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [drawLandmarksAndHUD]);

  const stopLiveDetectionLoop = useCallback(() => {
    isLoopRunningRef.current = false;
    optimalDurationRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Capture face and execute onCapture callback
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || isProcessingRef.current) return;
    
    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    setAutoCaptureCountdown(null);
    optimalDurationRef.current = 0;
    
    try {
      // High-precision 128-float descriptor extraction
      const descriptor = await getFaceDescriptor(videoRef.current);
      
      if (!descriptor) {
        setError('Wajah tidak terdeteksi jelas. Pastikan wajah tepat berada di dalam lingkaran panduan dan pencahayaan terang.');
        setIsProcessing(false);
        // Allow user to try auto-capture again after 2 seconds
        setTimeout(() => {
          hasCapturedRef.current = false;
          optimalDurationRef.current = 0;
        }, 2000);
        return;
      }
      
      const descriptorArray = descriptorToArray(descriptor);
      const result = await onCapture(descriptorArray);
      
      if (result && typeof result === 'object' && result.success === false) {
        setSuccess(false);
        setError(result.message || 'Wajah tidak cocok dengan data pendaftaran.');
        // Allow user to try auto-capture again after 2 seconds
        setTimeout(() => {
          hasCapturedRef.current = false;
          optimalDurationRef.current = 0;
        }, 2000);
      } else {
        setSuccess(true);
        setError(null);
        stopLiveDetectionLoop();
      }
      
    } catch (err: any) {
      console.error('Capture error:', err);
      setSuccess(false);
      setError(err?.message || 'Terjadi kesalahan saat memproses data wajah.');
      setTimeout(() => {
        hasCapturedRef.current = false;
        optimalDurationRef.current = 0;
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  }, [onCapture, stopLiveDetectionLoop]);

  // Keep handleCaptureRef pointing to the latest version
  handleCaptureRef.current = handleCapture;

  const retry = () => {
    hasCapturedRef.current = false;
    optimalDurationRef.current = 0;
    setAutoCaptureCountdown(null);
    setSuccess(false);
    setError(null);
    startLiveDetectionLoop();
  };

  const handleSimulateFace = async () => {
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

  // Helper styles based on live guidance state
  const getStatusColor = () => {
    if (success) return 'text-emerald-400 border-emerald-500';
    switch (liveState.status) {
      case 'optimal':
        return 'text-emerald-400 border-emerald-500 shadow-emerald-500/40';
      case 'too_far':
        return 'text-amber-400 border-amber-500 shadow-amber-500/30';
      case 'too_close':
        return 'text-orange-400 border-orange-500 shadow-orange-500/30';
      case 'off_center':
        return 'text-yellow-400 border-yellow-500 shadow-yellow-500/30';
      default:
        return 'text-cyan-400 border-cyan-500 shadow-cyan-500/20';
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in">
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>{title}</span>
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
            <Zap className="w-3 h-3" /> Live AI
          </span>
        </h2>
        
        {/* Auto capture toggle button */}
        {!success && (
          <button
            type="button"
            onClick={() => setAutoCaptureEnabled(prev => !prev)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 font-medium",
              autoCaptureEnabled 
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            )}
            title="Otomatis mengambil foto saat wajah berada di jarak optimal"
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto: {autoCaptureEnabled ? 'ON' : 'OFF'}</span>
          </button>
        )}
      </div>
      
      {/* Real-time Distance Meter Indicator Bar */}
      {!success && !isInitializing && !error && (
        <div className="w-full mb-3 bg-slate-900/80 border border-white/10 rounded-xl p-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5 px-1">
            <span className={cn(liveState.status === 'too_far' && 'text-amber-400 font-bold flex items-center gap-0.5')}>
              <Maximize2 className="w-3 h-3 inline" /> Terlalu Jauh
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-bold",
              liveState.status === 'optimal' 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "text-slate-400"
            )}>
              {liveState.status === 'optimal' ? '✓ Jarak Ideal' : 'Panduan Jarak'}
            </span>
            <span className={cn(liveState.status === 'too_close' && 'text-orange-400 font-bold flex items-center gap-0.5')}>
              Terlalu Dekat <Minimize2 className="w-3 h-3 inline" />
            </span>
          </div>

          {/* Meter track */}
          <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden flex items-center">
            {/* Zones: Amber left (22%), Green center (56%), Orange right (22%) */}
            <div className="w-[22%] h-full bg-amber-500/20 border-r border-slate-700" />
            <div className="w-[56%] h-full bg-emerald-500/30 border-r border-slate-700 relative">
              <div className="absolute inset-0 bg-emerald-400/20 animate-pulse" />
            </div>
            <div className="w-[22%] h-full bg-orange-500/20" />

            {/* Dynamic cursor needle indicator */}
            {liveState.detected && (
              <div 
                className={cn(
                  "absolute top-0 bottom-0 w-3 rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-150",
                  liveState.status === 'optimal'
                    ? "bg-emerald-400 shadow-emerald-400/80 scale-125"
                    : liveState.status === 'too_far'
                    ? "bg-amber-400 shadow-amber-400/80"
                    : liveState.status === 'too_close'
                    ? "bg-orange-400 shadow-orange-400/80"
                    : "bg-yellow-400 shadow-yellow-400/80"
                )}
                style={{ left: `${Math.min(95, Math.max(5, liveState.distanceScore))}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Camera Viewport with Biometric Face Placeholder Guide */}
      <div className="camera-viewport mb-4 relative overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl bg-black">
        {isInitializing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white z-20">
            <Loader2 className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-semibold">Menyiapkan Kamera & AI Wajah...</p>
            <p className="text-xs text-slate-400 mt-1">Memuat model deteksi real-time</p>
          </div>
        ) : error && !streamRef.current ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-red-400 p-6 text-center z-20">
            <AlertTriangle className="w-10 h-10 mb-3 text-red-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : null}
        
        {/* Live video feed */}
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
        
        {/* Overlay canvas for biometric mesh dots & laser contour */}
        <canvas 
          ref={canvasRef} 
          className={cn(
            "absolute inset-0 pointer-events-none z-10 w-full h-full",
            success && "hidden"
          )} 
        />
        
        {/* Biometric SVG Face Placeholder (Oval Outline & Head Silhouette) */}
        {!success && !isInitializing && !error && (
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
            {/* Dark translucent vignette mask with center oval cutout */}
            <svg 
              className="absolute inset-0 w-full h-full" 
              viewBox="0 0 400 300" 
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="face-oval-mask">
                  {/* Fill entire background with white (visible) */}
                  <rect width="400" height="300" fill="white" />
                  {/* Punch an oval hole with black (transparent viewport for face) */}
                  <ellipse cx="200" cy="145" rx="78" ry="105" fill="black" />
                </mask>
              </defs>
              {/* Outer dark dimming layer */}
              <rect 
                width="400" 
                height="300" 
                fill="rgba(5, 10, 20, 0.42)" 
                mask="url(#face-oval-mask)" 
              />
            </svg>

            {/* Glowing biometric guide frame */}
            <div className="relative flex items-center justify-center w-[200px] h-[260px] sm:w-[220px] sm:h-[280px]">
              {/* Oval guide ring */}
              <div 
                className={cn(
                  "absolute inset-0 rounded-[50%] border-2 transition-all duration-300",
                  liveState.status === 'optimal'
                    ? "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] animate-pulse"
                    : liveState.status === 'too_far'
                    ? "border-amber-400 border-dashed shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    : liveState.status === 'too_close'
                    ? "border-orange-400 border-dashed shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                    : liveState.status === 'off_center'
                    ? "border-yellow-400 border-dashed shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                    : "border-cyan-400/70 border-dashed shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                )}
              />

              {/* Head & Shoulder subtle placeholder silhouette */}
              <svg 
                className="w-32 h-44 opacity-25 transition-opacity duration-300"
                viewBox="0 0 100 130"
                fill="none" 
                stroke="currentColor"
              >
                {/* Head oval */}
                <ellipse 
                  cx="50" 
                  cy="45" 
                  rx="26" 
                  ry="34" 
                  className={cn(
                    liveState.status === 'optimal' ? "text-emerald-400" : "text-cyan-300"
                  )}
                  strokeWidth="1.5" 
                  strokeDasharray="3 3"
                />
                {/* Eye level horizon line */}
                <line 
                  x1="35" 
                  y1="40" 
                  x2="65" 
                  y2="40" 
                  className={cn(
                    liveState.status === 'optimal' ? "text-emerald-400" : "text-cyan-300"
                  )}
                  strokeWidth="1" 
                  strokeDasharray="2 2"
                />
                {/* Nose center marker */}
                <line 
                  x1="50" 
                  y1="42" 
                  x2="50" 
                  y2="52" 
                  className={cn(
                    liveState.status === 'optimal' ? "text-emerald-400" : "text-cyan-300"
                  )}
                  strokeWidth="1"
                />
                {/* Chin line */}
                <path 
                  d="M42 68 Q50 74 58 68" 
                  className={cn(
                    liveState.status === 'optimal' ? "text-emerald-400" : "text-cyan-300"
                  )}
                  strokeWidth="1" 
                />
                {/* Shoulders */}
                <path 
                  d="M16 125 C20 95, 35 90, 50 90 C65 90, 80 95, 84 125" 
                  className={cn(
                    liveState.status === 'optimal' ? "text-emerald-400" : "text-cyan-300"
                  )}
                  strokeWidth="1.2" 
                  strokeDasharray="3 3"
                />
              </svg>

              {/* Moving biometric laser scan line */}
              <div 
                className={cn(
                  "absolute inset-x-4 h-0.5 rounded-full transition-all duration-300",
                  liveState.status === 'optimal' 
                    ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]" 
                    : "bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#06b6d4]",
                  "animate-[bounce_2.5s_infinite_ease-in-out]"
                )}
                style={{ top: '40%' }}
              />

              {/* Directional helper icons based on distance/position */}
              {liveState.status === 'too_far' && (
                <div className="absolute inset-0 flex items-center justify-center animate-ping pointer-events-none opacity-40">
                  <Maximize2 className="w-16 h-16 text-amber-400" />
                </div>
              )}
              {liveState.status === 'too_close' && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none opacity-40">
                  <Minimize2 className="w-16 h-16 text-orange-400" />
                </div>
              )}
              {liveState.status === 'off_center' && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none opacity-40">
                  <Move className="w-12 h-12 text-yellow-400" />
                </div>
              )}

              {/* Auto capture countdown overlay badge inside oval */}
              {autoCaptureCountdown !== null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs rounded-[50%] animate-scale-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                    <span className="text-2xl font-black text-emerald-300 animate-pulse">
                      {autoCaptureCountdown}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 mt-2 bg-black/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                    Tahan Posisi...
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Real-time Status Floating Pill */}
            <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none z-20">
              <div 
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg flex items-center gap-2 max-w-[90%] truncate transition-all duration-200",
                  liveState.status === 'optimal'
                    ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-emerald-900/40"
                    : liveState.status === 'too_far'
                    ? "bg-amber-950/90 text-amber-200 border-amber-500/60 shadow-amber-900/40"
                    : liveState.status === 'too_close'
                    ? "bg-orange-950/90 text-orange-200 border-orange-500/60 shadow-orange-900/40"
                    : liveState.status === 'off_center'
                    ? "bg-yellow-950/90 text-yellow-200 border-yellow-500/60 shadow-yellow-900/40"
                    : "bg-slate-950/85 text-cyan-300 border-cyan-500/50 shadow-cyan-900/30"
                )}
              >
                {liveState.status === 'optimal' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : liveState.status === 'too_far' ? (
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : liveState.status === 'too_close' ? (
                  <Minimize2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                ) : liveState.status === 'off_center' ? (
                  <Move className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                )}
                <span className="truncate">{liveState.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md z-30 animate-fade-in">
            <div className="relative mb-3">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
              <Zap className="w-5 h-5 text-emerald-300 absolute inset-0 m-auto" />
            </div>
            <p className="text-white text-sm font-bold tracking-wide">
              {mode === 'verify' ? 'Memverifikasi Biometrik Wajah...' : 'Merekam 128 Vektor Wajah...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Mencocokkan dengan model FaceNet</p>
          </div>
        )}

        {/* Success Overlay (Rendered when verification actually succeeded) */}
        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/80 backdrop-blur-md z-30 animate-fade-in">
            <div className="bg-emerald-500/20 p-4 rounded-full border-2 border-emerald-400 mb-3 shadow-xl shadow-emerald-900/60 animate-scale-in">
              <CheckCircle className="w-14 h-14 text-emerald-400" />
            </div>
            <p className="text-emerald-200 font-extrabold text-base bg-black/60 px-5 py-2 rounded-full border border-emerald-500/40 shadow-lg">
              {successMessage || (mode === 'verify' ? 'Wajah Cocok & Terverifikasi' : 'Wajah Berhasil Direkam')}
            </p>
          </div>
        )}
      </div>

      {/* Error Message Box */}
      {error && (
        <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-4 mb-4 w-full text-left animate-fade-in shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-300 uppercase tracking-wider">Verifikasi Wajah Gagal</p>
              <p className="text-xs text-red-200 leading-relaxed">{error}</p>
              {mode === 'verify' && (
                <div className="pt-2">
                  <Link 
                    href="/intern/register-face" 
                    className="text-xs text-amber-300 hover:text-amber-200 underline font-medium flex items-center gap-1"
                  >
                    Wajah belum terdaftar atau berubah? Klik untuk Daftar Ulang Wajah →
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
          className="btn-secondary w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
        >
          <RefreshCcw className="w-4 h-4" /> Ambil Foto Lagi
        </button>
      ) : (
        <div className="w-full space-y-2.5">
          <button 
            type="button" 
            onClick={handleCapture}
            disabled={isInitializing || isProcessing || !streamRef.current}
            className={cn(
              "btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base rounded-xl font-bold shadow-xl transition-all disabled:opacity-50",
              liveState.status === 'optimal'
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-900/50"
                : "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-white/10"
            )}
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

          {/* Quick tips */}
          <p className="text-[11px] text-center text-slate-400">
            {autoCaptureEnabled ? (
              <span>💡 Wajah di lingkaran hijau otomatis terfoto dalam 2 detik</span>
            ) : (
              <span>💡 Posisikan wajah di lingkaran panduan lalu tekan tombol di atas</span>
            )}
          </p>
          
          {/* Fallback simulation button for testing if webcam is unavailable */}
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
