'use client';

import { useState, useEffect } from 'react';
import { getCurrentPosition, validateGeofence } from '@/lib/haversine';
import type { GeoPosition, GeofenceResult } from '@/types';
import { MapPin, MapPinOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeofenceCheckerProps {
  officePos: GeoPosition;
  maxRadius: number;
  onValid: (position: GeoPosition, distance: number) => void;
}

export function GeofenceChecker({ officePos, maxRadius, onValid }: GeofenceCheckerProps) {
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'error'>('checking');
  const [message, setMessage] = useState('Memeriksa lokasi...');
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkLocation() {
      try {
        const userPos = await getCurrentPosition();
        if (!mounted) return;

        const result = validateGeofence(userPos, officePos, maxRadius);
        
        if (result.isValid) {
          setStatus('valid');
          setMessage(result.message);
          setDistance(result.distance);
          onValid(userPos, result.distance);
        } else {
          setStatus('invalid');
          setMessage(result.message);
          setDistance(result.distance);
        }
      } catch (err: any) {
        if (!mounted) return;
        setStatus('error');
        setMessage(err.message || 'Gagal mendapatkan lokasi.');
      }
    }

    checkLocation();

    return () => {
      mounted = false;
    };
  }, [officePos, maxRadius, onValid]);

  return (
    <div className={cn(
      "glass-card p-6 w-full max-w-md mx-auto flex flex-col items-center text-center transition-colors",
      status === 'valid' && "border-emerald-500/50 bg-emerald-950/20",
      status === 'invalid' && "border-red-500/50 bg-red-950/20",
      status === 'error' && "border-amber-500/50 bg-amber-950/20"
    )}>
      
      {status === 'checking' && (
        <>
          <div className="bg-blue-500/20 p-4 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Mencari Lokasi GPS</h3>
          <p className="text-sm text-slate-400">Pastikan GPS perangkat Anda aktif...</p>
        </>
      )}

      {status === 'valid' && (
        <>
          <div className="bg-emerald-500/20 p-4 rounded-full mb-4 pulse-dot text-emerald-400">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-lg mb-1 text-emerald-400">Lokasi Valid</h3>
          <p className="text-sm text-slate-300">{message}</p>
        </>
      )}

      {status === 'invalid' && (
        <>
          <div className="bg-red-500/20 p-4 rounded-full mb-4">
            <MapPinOff className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="font-semibold text-lg mb-1 text-red-400">Di Luar Jangkauan</h3>
          <p className="text-sm text-slate-300">{message}</p>
          <div className="flex flex-col gap-2 mt-4 w-full">
            <button 
              onClick={() => window.location.reload()} 
              className="btn-secondary text-sm w-full"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus('valid');
                setMessage('Mode Demo: Simulasi lokasi di kantor aktif (jarak 15m).');
                setDistance(15);
                onValid({ lat: officePos.lat, long: officePos.long }, 15);
              }}
              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs transition-colors"
            >
              📍 Simulasikan di Kantor (Demo Testing)
            </button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="bg-amber-500/20 p-4 rounded-full mb-4">
            <MapPinOff className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="font-semibold text-lg mb-1 text-amber-400">Akses GPS Gagal</h3>
          <p className="text-sm text-slate-300">{message}</p>
          <div className="flex flex-col gap-2 mt-4 w-full">
            <button 
              onClick={() => window.location.reload()} 
              className="btn-secondary text-sm w-full"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus('valid');
                setMessage('Mode Demo: Simulasi lokasi di kantor aktif (jarak 15m).');
                setDistance(15);
                onValid({ lat: officePos.lat, long: officePos.long }, 15);
              }}
              className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs transition-colors"
            >
              📍 Simulasikan di Kantor (Demo Testing)
            </button>
          </div>
        </>
      )}

    </div>
  );
}
