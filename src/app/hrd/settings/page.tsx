'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, MapPin, DollarSign, AlertCircle, Crosshair } from 'lucide-react';
import type { Settings } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success) {
          setSettings(json.data);
        } else {
          setMessage({ type: 'error', text: json.error });
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Gagal memuat pengaturan.' });
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
        setSettings(json.data);
      } else {
        throw new Error(json.error || 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!settings) return;
    setSettings({
      ...settings,
      [name]: parseFloat(value) || 0,
    });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Browser tidak mendukung GPS Geolocation.' });
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingLocation(false);
        if (settings) {
          setSettings({
            ...settings,
            office_lat: pos.coords.latitude,
            office_long: pos.coords.longitude,
          });
          setMessage({
            type: 'success',
            text: `Koordinat GPS berhasil disinkronkan ke lokasi saat ini: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
          });
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        setMessage({ type: 'error', text: 'Gagal mendeteksi lokasi GPS: ' + err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Pengaturan Sistem</h1>
        <p className="text-slate-400">Konfigurasi lokasi kantor dan parameter perhitungan uang saku.</p>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {settings && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          
          {/* Geofence Settings */}
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                Koordinat & Geofence
              </h2>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400"
              >
                {isDetectingLocation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" />
                )}
                <span>Gunakan Lokasi GPS Saya Saat Ini</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Latitude Kantor</label>
                <input
                  type="number"
                  step="any"
                  name="office_lat"
                  value={settings.office_lat}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Longitude Kantor</label>
                <input
                  type="number"
                  step="any"
                  name="office_long"
                  value={settings.office_long}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Radius Maksimal (Meter)</label>
              <input
                type="number"
                name="max_radius_meters"
                value={settings.max_radius_meters}
                onChange={handleChange}
                className="input-field"
                required
                min="10"
                max="5000"
              />
              <p className="text-xs text-slate-500 mt-1">Jarak maksimum intern diizinkan absen dari titik kantor.</p>
            </div>
          </div>

          {/* Rate Settings */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Tarif Uang Saku
            </h2>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg mb-6">
              <p className="text-sm text-amber-400/90">
                Data tarif uang saku bersifat rahasia dan hanya dapat diakses oleh HRD.
                Sistem otomatis menghitung Full Day jika intern bekerja &gt; 6 jam.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Tarif Full Day (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                  <input
                    type="number"
                    name="full_day_rate"
                    value={settings.full_day_rate}
                    onChange={handleChange}
                    className="input-field pl-10"
                    required
                    min="0"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Tarif Half Day (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                  <input
                    type="number"
                    name="half_day_rate"
                    value={settings.half_day_rate}
                    onChange={handleChange}
                    className="input-field pl-10"
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Simpan Pengaturan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
