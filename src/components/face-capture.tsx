'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  loadFaceApiModels, 
  getFaceDescriptor, 
  descriptorToArray, 
  detectLiveFace,
  combineDescriptors,
  type LiveDetectionResult 
} from '@/lib/face-api';
import { 
  CheckCircle, 
  CheckCircle2,
  RefreshCcw, 
  AlertTriangle, 
  Loader2, 
  Sparkles,
  Maximize2,
  Minimize2,
  Move,
  Check,
  Zap,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  FastForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export type LivenessStep = 'front' | 'turn' | 'final';

export interface RegistrationStepConfig {
  id: LivenessStep;
  title: string;
  short: string;
  instruction: string;
  tip: string;
}

export const REGISTRATION_STEPS: RegistrationStepConfig[] = [
  {
    id: 'front',
    title: '1. Hadap Depan',
    short: 'Depan',
    instruction: 'Tatap lurus ke kamera di dalam lingkaran',
    tip: 'Tahan posisi lurus dan santai hingga hitungan selesai',
  },
  {
    id: 'turn',
    title: '2. Sedikit Menoleh',
    short: 'Menoleh',
    instruction: 'Sedikit tolehkan wajah ke samping (kanan atau kiri)',
    tip: 'Tahan putaran kepala santai (15-20°) hingga hitungan selesai',
  },
  {
    id: 'final',
    title: '3. Konfirmasi Depan',
    short: 'Selesai',
    instruction: 'Kembali tatap lurus ke kamera untuk menyimpan',
    tip: 'Tahan posisi lurus sejenak untuk memfinalisasi biometrik',
  },
];

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
  mode = "verify",
  successMessage
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef(false);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('Memproses Biometrik Wajah...');
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

  // Countdown overlay: null when inactive, 2.. 1.. 0
  const [stepCountdown, setStepCountdown] = useState<number | null>(null);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);

  // Multi-pose Registration State
  const [regStep, setRegStep] = useState<LivenessStep>('front');
  const [completedSteps, setCompletedSteps] = useState<Record<LivenessStep, boolean>>({
    front: false,
    turn: false,
    final: false,
  });
  const [stepSuccessToast, setStepSuccessToast] = useState<string | null>(null);

  const regStepRef = useRef<LivenessStep>('front');
  const completedStepsRef = useRef<Record<LivenessStep, boolean>>({
    front: false,
    turn: false,
    final: false,
  });
  
  // Hold durations
  const stepHoldTimeRef = useRef(0);
  const optimalDurationRef = useRef(0);
  const isExtractingRef = useRef(false);
  const hasCapturedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const successRef = useRef(false);

  // Storage for multi-angle samples
  const sampledDescriptorsRef = useRef<{
    front?: Float32Array;
    turn?: Float32Array;
    final?: Float32Array;
  }>({});
  const lastGoodDescriptorRef = useRef<Float32Array | null>(null);

  // Initialize camera and models on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setIsInitializing(true);
        // Load AI models
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

  // Draw live biometric mesh on canvas overlay
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

      // Draw subtle biometric landmark dots
      ctx.fillStyle = dotColor;
      ctx.shadowColor = dotColor;
      ctx.shadowBlur = isOptimal ? 6 : 3;

      for (let i = 0; i < result.landmarks.length; i += 2) {
        const pt = result.landmarks[i];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isOptimal ? 2.2 : 1.6, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw subtle connecting facial contours
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

  const stopLiveDetectionLoop = useCallback(() => {
    isLoopRunningRef.current = false;
    optimalDurationRef.current = 0;
    stepHoldTimeRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Submit collected face data
  const finalizeRegistration = useCallback(async () => {
    if (!videoRef.current || isProcessingRef.current) return;

    setIsProcessing(true);
    isProcessingRef.current = true;
    setProcessingText('Menggabungkan & Menyimpan Sampel Wajah...');
    setError(null);
    setSuccess(false);
    setStepCountdown(null);

    try {
      // Collect all gathered descriptors
      const samples: Float32Array[] = [];
      if (sampledDescriptorsRef.current.front) samples.push(sampledDescriptorsRef.current.front);
      if (sampledDescriptorsRef.current.turn) samples.push(sampledDescriptorsRef.current.turn);
      if (sampledDescriptorsRef.current.final) samples.push(sampledDescriptorsRef.current.final);
      if (samples.length === 0 && lastGoodDescriptorRef.current) {
        samples.push(lastGoodDescriptorRef.current);
      }

      // If for any reason no samples exist, extract fresh from video
      let finalVector: Float32Array;
      if (samples.length > 0) {
        finalVector = combineDescriptors(samples);
      } else {
        const fresh = await getFaceDescriptor(videoRef.current);
        if (!fresh) {
          throw new Error('Gagal mendeteksi wajah saat pengambilan akhir. Pastikan pencahayaan cukup.');
        }
        finalVector = fresh;
      }

      const descriptorArray = descriptorToArray(finalVector);

      // Ensure exact length 128 of finite numbers
      if (descriptorArray.length !== 128 || !descriptorArray.every(n => typeof n === 'number' && Number.isFinite(n))) {
        throw new Error('Format biometrik wajah tidak valid.');
      }

      const result = await onCapture(descriptorArray);

      if (result && typeof result === 'object' && result.success === false) {
        setSuccess(false);
        setError(result.message || 'Gagal menyimpan data wajah ke server.');
        setTimeout(() => {
          hasCapturedRef.current = false;
          isProcessingRef.current = false;
          setIsProcessing(false);
        }, 2500);
      } else {
        setSuccess(true);
        setError(null);
        stopLiveDetectionLoop();
      }
    } catch (err: any) {
      console.error('Finalize registration error:', err);
      setSuccess(false);
      setError(err?.message || 'Terjadi kesalahan saat menyimpan wajah.');
      setTimeout(() => {
        hasCapturedRef.current = false;
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 2500);
    }
  }, [onCapture, stopLiveDetectionLoop]);

  // Advance to next liveness step with visual feedback
  const advanceStep = useCallback((stepDone: LivenessStep, nextStep: LivenessStep, toastText?: string) => {
    stepHoldTimeRef.current = 0;
    setStepCountdown(null);

    completedStepsRef.current = {
      ...completedStepsRef.current,
      [stepDone]: true,
    };
    setCompletedSteps({ ...completedStepsRef.current });

    if (toastText) {
      setStepSuccessToast(toastText);
      setTimeout(() => setStepSuccessToast(null), 1400);
    }

    if (stepDone !== nextStep) {
      regStepRef.current = nextStep;
      setRegStep(nextStep);
    }
  }, []);

  const skipCurrentStep = useCallback(() => {
    const order: LivenessStep[] = ['front', 'turn', 'final'];
    const idx = order.indexOf(regStepRef.current);
    if (idx >= 0 && idx < order.length - 1) {
      const next = order[idx + 1];
      advanceStep(order[idx], next, `✓ Langkah dilewati`);
    } else {
      finalizeRegistration();
    }
  }, [advanceStep, finalizeRegistration]);

  // Main real-time live detection loop
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
        !successRef.current &&
        !isExtractingRef.current
      ) {
        if (timestamp - lastRunTime >= INTERVAL_MS) {
          lastRunTime = timestamp;
          try {
            const result = await detectLiveFace(videoRef.current);
            setLiveState(result);

            if (result.descriptor) {
              lastGoodDescriptorRef.current = result.descriptor;
            }

            if (canvasRef.current) {
              drawLandmarksAndHUD(canvasRef.current, videoRef.current, result);
            }

            // -------------------------------------------------------------
            // MODE: REGISTER (3-Step Enrollment with Calm, Clear Hold Countdown)
            // -------------------------------------------------------------
            if (mode === 'register') {
              if (
                !hasCapturedRef.current && 
                !isProcessingRef.current && 
                !successRef.current &&
                !isExtractingRef.current &&
                result.detected
              ) {
                const currentStep = regStepRef.current;
                const pose = result.pose;

                // Step 1: Frontal look (~1500ms hold with visible 2.. 1.. countdown)
                if (currentStep === 'front') {
                  const isFrontalReady = 
                    (result.status === 'optimal' || pose?.isFrontal) && 
                    result.status !== 'too_far' && 
                    result.status !== 'too_close';

                  if (isFrontalReady) {
                    stepHoldTimeRef.current += INTERVAL_MS;

                    const STABILIZE_MS = 300;
                    const TOTAL_MS = 1500; // 1.5 seconds total hold

                    if (stepHoldTimeRef.current < STABILIZE_MS) {
                      setStepCountdown(null);
                    } else if (stepHoldTimeRef.current >= TOTAL_MS) {
                      setStepCountdown(null);
                      stepHoldTimeRef.current = 0;

                      // Grab descriptor directly from current frame or fallback
                      const desc = result.descriptor || lastGoodDescriptorRef.current;
                      if (desc) {
                        sampledDescriptorsRef.current.front = desc;
                      }
                      advanceStep('front', 'turn', '✓ Langkah 1: Depan Tercatat!');
                    } else {
                      const remaining = Math.ceil((TOTAL_MS - stepHoldTimeRef.current) / 600);
                      setStepCountdown(Math.max(1, Math.min(2, remaining)));
                    }
                  } else {
                    stepHoldTimeRef.current = Math.max(0, stepHoldTimeRef.current - INTERVAL_MS / 2);
                    setStepCountdown(null);
                  }
                } 
                // Step 2: Slight turn to side (~1500ms hold with visible 2.. 1.. countdown)
                else if (currentStep === 'turn') {
                  const isTurned = 
                    pose?.yaw === 'right' || 
                    pose?.yaw === 'left' || 
                    (pose?.yawRatio !== undefined && (pose.yawRatio < 0.72 || pose.yawRatio > 1.38));

                  if (isTurned) {
                    stepHoldTimeRef.current += INTERVAL_MS;

                    const STABILIZE_MS = 300;
                    const TOTAL_MS = 1500; // 1.5 seconds total hold

                    if (stepHoldTimeRef.current < STABILIZE_MS) {
                      setStepCountdown(null);
                    } else if (stepHoldTimeRef.current >= TOTAL_MS) {
                      setStepCountdown(null);
                      stepHoldTimeRef.current = 0;

                      // Grab descriptor directly from current frame or fallback
                      const desc = result.descriptor || lastGoodDescriptorRef.current;
                      if (desc) {
                        sampledDescriptorsRef.current.turn = desc;
                      }
                      advanceStep('turn', 'final', '✓ Langkah 2: Samping Tercatat!');
                    } else {
                      const remaining = Math.ceil((TOTAL_MS - stepHoldTimeRef.current) / 600);
                      setStepCountdown(Math.max(1, Math.min(2, remaining)));
                    }
                  } else {
                    stepHoldTimeRef.current = Math.max(0, stepHoldTimeRef.current - INTERVAL_MS / 2);
                    setStepCountdown(null);
                  }
                } 
                // Step 3: Return to front & finalize (~1300ms hold with visible 2.. 1..)
                else if (currentStep === 'final') {
                  const isFrontalReady = 
                    (result.status === 'optimal' || pose?.isFrontal) && 
                    result.status !== 'too_far' && 
                    result.status !== 'too_close';

                  if (isFrontalReady) {
                    stepHoldTimeRef.current += INTERVAL_MS;

                    const STABILIZE_MS = 300;
                    const TOTAL_MS = 1300; // 1.3 seconds hold

                    if (stepHoldTimeRef.current < STABILIZE_MS) {
                      setStepCountdown(null);
                    } else if (stepHoldTimeRef.current >= TOTAL_MS) {
                      setStepCountdown(null);
                      hasCapturedRef.current = true;
                      stepHoldTimeRef.current = 0;

                      // Grab descriptor directly from current frame or fallback
                      const desc = result.descriptor || lastGoodDescriptorRef.current;
                      if (desc) {
                        sampledDescriptorsRef.current.final = desc;
                      }
                      advanceStep('final', 'final', '✓ Selesai! Menyimpan data...');
                      finalizeRegistration();
                    } else {
                      const remaining = Math.ceil((TOTAL_MS - stepHoldTimeRef.current) / 500);
                      setStepCountdown(Math.max(1, Math.min(2, remaining)));
                    }
                  } else {
                    stepHoldTimeRef.current = Math.max(0, stepHoldTimeRef.current - INTERVAL_MS / 2);
                    setStepCountdown(null);
                  }
                }
              }
            } 
            // -------------------------------------------------------------
            // MODE: VERIFY (Quick daily attendance auto-capture)
            // -------------------------------------------------------------
            else {
              if (result.status === 'optimal') {
                if (
                  !hasCapturedRef.current && 
                  !isProcessingRef.current && 
                  !successRef.current
                ) {
                  optimalDurationRef.current += INTERVAL_MS;

                  const STABILIZE_MS = 400;
                  const STEP_MS = 750;
                  const TOTAL_HOLD_MS = STABILIZE_MS + (STEP_MS * 2); // ~1.9s total

                  if (optimalDurationRef.current < STABILIZE_MS) {
                    setAutoCaptureCountdown(null);
                  } else if (optimalDurationRef.current >= TOTAL_HOLD_MS) {
                    hasCapturedRef.current = true;
                    setAutoCaptureCountdown(null);
                    handleVerifyCapture(result.descriptor);
                  } else {
                    const elapsedAfterStabilize = optimalDurationRef.current - STABILIZE_MS;
                    const remaining = 2 - Math.floor(elapsedAfterStabilize / STEP_MS);
                    setAutoCaptureCountdown(Math.max(1, Math.min(2, remaining)));
                  }
                }
              } else {
                optimalDurationRef.current = 0;
                setAutoCaptureCountdown(null);
              }
            }
          } catch (e) {
            // Ignore temporary frame glitch
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [drawLandmarksAndHUD, mode, advanceStep, finalizeRegistration]);


  // Verification capture handler (for daily attendance)
  const handleVerifyCapture = useCallback(async (currentDescriptor?: Float32Array) => {
    if (!videoRef.current || isProcessingRef.current) return;

    setIsProcessing(true);
    isProcessingRef.current = true;
    setProcessingText('Memverifikasi Biometrik Wajah...');
    setError(null);
    setSuccess(false);
    setAutoCaptureCountdown(null);

    try {
      const desc = currentDescriptor || await getFaceDescriptor(videoRef.current);
      if (!desc) {
        throw new Error('Wajah tidak terdeteksi jelas. Pastikan wajah tepat berada di dalam lingkaran panduan.');
      }

      const descriptorArray = descriptorToArray(desc);
      const result = await onCapture(descriptorArray);

      if (result && typeof result === 'object' && result.success === false) {
        setSuccess(false);
        setError(result.message || 'Wajah tidak cocok dengan data pendaftaran.');
        setTimeout(() => {
          hasCapturedRef.current = false;
          optimalDurationRef.current = 0;
          isProcessingRef.current = false;
          setIsProcessing(false);
        }, 2200);
      } else {
        setSuccess(true);
        setError(null);
        stopLiveDetectionLoop();
      }
    } catch (err: any) {
      console.error('Verify capture error:', err);
      setSuccess(false);
      setError(err?.message || 'Terjadi kesalahan saat memverifikasi wajah.');
      setTimeout(() => {
        hasCapturedRef.current = false;
        optimalDurationRef.current = 0;
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 2200);
    }
  }, [onCapture, stopLiveDetectionLoop]);

  const retry = () => {
    hasCapturedRef.current = false;
    isProcessingRef.current = false;
    isExtractingRef.current = false;
    optimalDurationRef.current = 0;
    stepHoldTimeRef.current = 0;
    sampledDescriptorsRef.current = {};
    setAutoCaptureCountdown(null);
    setStepCountdown(null);
    setSuccess(false);
    setError(null);
    regStepRef.current = 'front';
    setRegStep('front');
    setCompletedSteps({ front: false, turn: false, final: false });
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

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in">
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>{title}</span>
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
            <Zap className="w-3 h-3" /> Live AI
          </span>
        </h2>
        
        {/* Mode badge */}
        {!success && (
          <div className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{mode === 'register' ? '3-Langkah Presisi' : 'Auto Capture'}</span>
          </div>
        )}
      </div>

      {/* MULTI-POSE STEP TRACKER (Khusus Mode Registrasi Wajah: 3 Langkah Ringan) */}
      {mode === 'register' && !success && (
        <div className="w-full mb-3 p-2.5 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs mb-2 px-1">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Perekaman Presisi 3-Sudut
            </span>
            <span className="text-emerald-400 font-mono text-[11px] font-bold">
              {Object.values(completedSteps).filter(Boolean).length}/3 Langkah
            </span>
          </div>
          
          {/* Horizontal Step Pills */}
          <div className="grid grid-cols-3 gap-2">
            {REGISTRATION_STEPS.map((step) => {
              const isDone = completedSteps[step.id];
              const isCurrent = regStep === step.id;
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-2 rounded-lg text-center transition-all duration-300 border",
                    isDone
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      : isCurrent
                      ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-400"
                      : "bg-white/[0.03] text-slate-500 border-white/5"
                  )}
                >
                  <div className="text-[13px] mb-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-scale-in" />
                    ) : step.id === 'front' ? (
                      <UserCheck className="w-4 h-4" />
                    ) : step.id === 'turn' ? (
                      <div className="flex items-center gap-0.5">
                        <ArrowLeft className="w-3 h-3" />
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold truncate w-full">
                    {step.short}
                  </span>
                </div>
              );
            })}
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
        
        {/* Overlay canvas for biometric mesh dots */}
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
                  <rect width="400" height="300" fill="white" />
                  <ellipse cx="200" cy="145" rx="80" ry="108" fill="black" />
                </mask>
              </defs>
              <rect 
                width="400" 
                height="300" 
                fill="rgba(5, 10, 20, 0.40)" 
                mask="url(#face-oval-mask)" 
              />
            </svg>

            {/* Glowing biometric guide frame */}
            <div className="relative flex items-center justify-center w-[205px] h-[265px] sm:w-[225px] sm:h-[285px]">
              {/* Oval guide ring */}
              <div 
                className={cn(
                  "absolute inset-0 rounded-[50%] border-2 transition-all duration-300",
                  liveState.status === 'optimal'
                    ? "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]"
                    : mode === 'register' && regStep === 'turn'
                    ? "border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] animate-pulse"
                    : liveState.status === 'not_frontal'
                    ? "border-cyan-400 border-dashed shadow-[0_0_15px_rgba(6,182,212,0.3)]"
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
                <path 
                  d="M42 68 Q50 74 58 68" 
                  className={cn(
                    liveState.status === 'optimal' ? "text-emerald-400" : "text-cyan-300"
                  )} 
                  strokeWidth="1" 
                />
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

              {/* COUNTDOWN OVERLAY INSIDE OVAL (REGISTER MODE) */}
              {mode === 'register' && stepCountdown !== null && !stepSuccessToast && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-xs rounded-[50%] animate-scale-in z-20">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/25 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                    <span className="text-3xl font-black text-emerald-300 animate-pulse">
                      {stepCountdown}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-300 mt-2 bg-black/70 px-3 py-0.5 rounded-full border border-emerald-500/40">
                    Tahan Posisi...
                  </span>
                </div>
              )}

              {/* GESTURE PROMPTS INSIDE OVAL (REGISTER MODE, WHEN NOT COUNTING DOWN) */}
              {mode === 'register' && stepCountdown === null && !stepSuccessToast && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-3">
                  {regStep === 'front' && (
                    <div className="flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-emerald-500/40 shadow-xl animate-fade-in">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 mb-1">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-emerald-200">Hadap Depan</span>
                    </div>
                  )}

                  {regStep === 'turn' && (
                    <div className="flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-cyan-500/40 shadow-xl animate-fade-in">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 mb-1 animate-bounce">
                        <div className="flex items-center gap-1">
                          <ArrowLeft className="w-4 h-4" />
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-cyan-200">Sedikit Menoleh</span>
                      <span className="text-[10px] text-cyan-300/80">Kanan atau Kiri</span>
                    </div>
                  )}

                  {regStep === 'final' && (
                    <div className="flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm px-4 py-3 rounded-2xl border border-emerald-500/50 shadow-xl animate-scale-in">
                      <Sparkles className="w-8 h-8 text-emerald-400 animate-spin mb-1.5" />
                      <span className="text-xs font-extrabold text-emerald-300 text-center">
                        Tatap Depan...
                      </span>
                      <span className="text-[10px] text-slate-300 mt-0.5">Menyimpan Wajah</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step Success Toast Flash Inside Oval */}
              {stepSuccessToast && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/85 backdrop-blur-sm rounded-[50%] p-3 animate-scale-in z-20">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-1.5 shadow-lg shadow-emerald-500/50">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-extrabold text-emerald-200 text-center px-2">
                    {stepSuccessToast}
                  </span>
                </div>
              )}

              {/* Distance / centering hints */}
              {!stepSuccessToast && stepCountdown === null && liveState.status === 'too_far' && (
                <div className="absolute inset-0 flex items-center justify-center animate-ping pointer-events-none opacity-40">
                  <Maximize2 className="w-16 h-16 text-amber-400" />
                </div>
              )}
              {!stepSuccessToast && stepCountdown === null && liveState.status === 'too_close' && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none opacity-40">
                  <Minimize2 className="w-16 h-16 text-orange-400" />
                </div>
              )}
              {!stepSuccessToast && stepCountdown === null && liveState.status === 'off_center' && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse pointer-events-none opacity-40">
                  <Move className="w-12 h-12 text-yellow-400" />
                </div>
              )}

              {/* Auto capture countdown overlay badge inside oval (MODE VERIFY ONLY) */}
              {mode === 'verify' && autoCaptureCountdown !== null && (
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
                    : mode === 'register' && regStep === 'turn'
                    ? "bg-cyan-950/90 text-cyan-200 border-cyan-500/60 shadow-cyan-900/40"
                    : liveState.status === 'not_frontal'
                    ? "bg-slate-900/90 text-cyan-200 border-cyan-500/50"
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
                ) : mode === 'register' && regStep === 'turn' ? (
                  <div className="flex items-center gap-0.5 shrink-0 text-cyan-400">
                    <ArrowLeft className="w-3 h-3" />
                    <ArrowRight className="w-3 h-3" />
                  </div>
                ) : liveState.status === 'too_far' ? (
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : liveState.status === 'too_close' ? (
                  <Minimize2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                ) : liveState.status === 'off_center' ? (
                  <Move className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                )}
                <span className="truncate">
                  {mode === 'register' && regStep !== 'final'
                    ? REGISTRATION_STEPS.find(s => s.id === regStep)?.instruction || liveState.message
                    : liveState.message}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-30 animate-fade-in">
            <div className="relative mb-3">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
              <Zap className="w-5 h-5 text-emerald-300 absolute inset-0 m-auto" />
            </div>
            <p className="text-white text-sm font-bold tracking-wide">
              {processingText}
            </p>
            <p className="text-xs text-slate-400 mt-1">Menghubungkan ke database server...</p>
          </div>
        )}

        {/* Success Overlay */}
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
              <p className="text-xs font-bold text-red-300 uppercase tracking-wider">Perekaman Wajah Gagal</p>
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
      
      {/* Action Area */}
      {success ? (
        <button 
          type="button" 
          onClick={retry}
          className="btn-secondary w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
        >
          <RefreshCcw className="w-4 h-4" /> Pindai Wajah Lagi
        </button>
      ) : (
        <div className="w-full space-y-3">
          {/* Status banner with dynamic guidance */}
          {mode === 'register' ? (
            <div className="w-full p-3.5 rounded-xl border bg-slate-900/80 border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  {REGISTRATION_STEPS.find(s => s.id === regStep)?.title || 'Perekaman Wajah'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {REGISTRATION_STEPS.find(s => s.id === regStep)?.tip}
                </span>
              </div>

              {/* Progress bar across 3 registration steps */}
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300"
                  style={{
                    width: `${(Object.values(completedSteps).filter(Boolean).length / 3) * 100}%`
                  }}
                />
              </div>

              {/* Subtitle & Skip step */}
              <div className="flex items-center justify-between text-[11px] px-1 pt-1">
                <span className="text-slate-400">
                  Tahan posisi santai saat hitungan mundur muncul
                </span>
                <button
                  type="button"
                  onClick={skipCurrentStep}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors underline cursor-pointer"
                >
                  <FastForward className="w-3 h-3" />
                  Lewati Gerakan
                </button>
              </div>
            </div>
          ) : (
            <div className={cn(
              "w-full p-3.5 rounded-xl border text-center transition-all duration-300",
              liveState.status === 'optimal'
                ? "bg-emerald-950/60 border-emerald-500/50 shadow-lg shadow-emerald-950/50"
                : "bg-slate-900/60 border-white/10"
            )}>
              {liveState.status === 'optimal' ? (
                <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Posisi Sempurna! Otomatis mengambil foto...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-slate-300 text-xs font-medium">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Posisikan wajah di lingkaran hingga hijau. Foto otomatis diambil.</span>
                </div>
              )}
            </div>
          )}
          
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
