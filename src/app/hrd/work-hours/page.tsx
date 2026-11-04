'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Save,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Info,
  Calculator,
} from 'lucide-react';
import {
  DEFAULT_WORK_START_TIME,
  DEFAULT_FULL_DAY_MAX_IN,
  DEFAULT_WORK_END_TIME,
} from '@/lib/constants';

export default function WorkHoursSettingsPage() {
  const [workStartTime, setWorkStartTime] = useState(DEFAULT_WORK_START_TIME);
  const [fullDayMaxIn, setFullDayMaxIn] = useState(DEFAULT_FULL_DAY_MAX_IN);
  const [workEndTime, setWorkEndTime] = useState(DEFAULT_WORK_END_TIME);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Interactive simulator state
  const [simIn, setSimIn] = useState('08:15');
  const [simOut, setSimOut] = useState('16:00');

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        const meJson = await meRes.json();
        if (!meJson.success || meJson.data?.role !== 'super_admin') {
          window.location.href = '/hrd/dashboard';
          return;
        }

        const res = await fetch('/api/admin/work-hours');
        const json = await res.json();
        if (json.success && json.data) {
          setWorkStartTime(json.data.work_start_time || DEFAULT_WORK_START_TIME);
          setFullDayMaxIn(json.data.full_day_max_in || DEFAULT_FULL_DAY_MAX_IN);
          setWorkEndTime(json.data.work_end_time || DEFAULT_WORK_END_TIME);
          setUpdatedAt(json.data.updated_at || null);
        }
      } catch {
        setFeedback({ type: 'error', text: 'Gagal memuat pengaturan jam absen.' });
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/work-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_start_time: workStartTime,
          full_day_max_in: fullDayMaxIn,
          work_end_time: workEndTime,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan pengaturan.');
      }

      setWorkStartTime(json.data.work_start_time);
      setFullDayMaxIn(json.data.full_day_max_in);
      setWorkEndTime(json.data.work_end_time);
      setUpdatedAt(json.data.updated_at || new Date().toISOString());
      setFeedback({
        type: 'success',
        text: json.message || 'Pengaturan periode jam absen berhasil diperbarui.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setWorkStartTime(DEFAULT_WORK_START_TIME);
    setFullDayMaxIn(DEFAULT_FULL_DAY_MAX_IN);
    setWorkEndTime(DEFAULT_WORK_END_TIME);
    setFeedback(null);
  };

  // Simulator calculation
  const isSimFullDay = simIn <= fullDayMaxIn && simOut >= workEndTime;
  const simReason = isSimFullDay
    ? `Absen masuk (${simIn}) <= ${fullDayMaxIn} DAN absen pulang (${simOut}) >= ${workEndTime}`
    : simIn > fullDayMaxIn
    ? `Absen masuk (${simIn}) melewati batas maksimal Full Day (${fullDayMaxIn})`
    : `Absen pulang (${simOut}) sebelum jam pulang minimal (${workEndTime})`;

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="spinner !w-8 !h-8"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Khusus Super Admin
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            Pengaturan Periode Jam Absen
          </h1>
          <p className="text-slate-400 text-sm">
            Atur batas jam masuk dan jam pulang untuk menentukan status kehadiran{' '}
            <strong className="text-emerald-400">Satu Hari Penuh (Full Day)</strong> dan{' '}
            <strong className="text-amber-400">Setengah Hari (Half Day)</strong>.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Form Konfigurasi Jam Absen */}
      <form onSubmit={handleSave} className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Batas Waktu Presensi (WIB)</h2>
              <p className="text-xs text-slate-400">
                Digunakan secara otomatis saat anak magang melakukan Absen Keluar (Check-Out).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default (08:30 / 10:30 / 16:00)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Jam Masuk Standar
            </label>
            <input
              type="time"
              value={workStartTime}
              onChange={(e) => setWorkStartTime(e.target.value)}
              className="input-field font-mono text-base"
              required
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Acuan jam mulai kerja pagi normal (Default: <strong>08:30</strong> WIB).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
              Batas Maks Masuk Full Day
            </label>
            <input
              type="time"
              value={fullDayMaxIn}
              onChange={(e) => setFullDayMaxIn(e.target.value)}
              className="input-field font-mono text-base border-amber-500/30"
              required
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Masuk &le; <strong>{fullDayMaxIn}</strong> berhak Full Day; masuk &gt;{' '}
              <strong>{fullDayMaxIn}</strong> otomatis Half Day.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">
              Batas Minimal Jam Pulang
            </label>
            <input
              type="time"
              value={workEndTime}
              onChange={(e) => setWorkEndTime(e.target.value)}
              className="input-field font-mono text-base border-emerald-500/30"
              required
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Pulang &ge; <strong>{workEndTime}</strong> untuk Full Day; pulang &lt;{' '}
              <strong>{workEndTime}</strong> terhitung Half Day.
            </p>
          </div>
        </div>

        {/* Ringkasan Aturan */}
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <Info className="w-4 h-4" />
            Ringkasan Aturan Perhitungan Aktif
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="font-bold text-emerald-400 mb-1">1. Full Day (Satu Hari Penuh / H)</div>
              <p className="text-slate-300 leading-relaxed">
                Absen masuk <strong>&le; {fullDayMaxIn}</strong> WIB <u>dan</u> absen pulang{' '}
                <strong>&ge; {workEndTime}</strong> WIB.
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                Contoh: 08:15 s/d {workEndTime} &rarr; Full Day
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="font-bold text-amber-400 mb-1">2. Half Day (Pulang Lebih Awal / 1/2)</div>
              <p className="text-slate-300 leading-relaxed">
                Absen masuk <strong>&le; {fullDayMaxIn}</strong> WIB tetapi absen pulang{' '}
                <strong>&lt; {workEndTime}</strong> WIB.
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                Contoh: {workStartTime} s/d 12:30 &rarr; Half Day
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="font-bold text-amber-400 mb-1">3. Half Day (Masuk Siang / 1/2)</div>
              <p className="text-slate-300 leading-relaxed">
                Absen masuk <strong>&gt; {fullDayMaxIn}</strong> WIB (berapa pun jam pulangnya).
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                Contoh: 11:00 s/d 16:10 &rarr; Half Day
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {updatedAt
              ? `Terakhir diperbarui: ${new Date(updatedAt).toLocaleString('id-ID', {
                  timeZone: 'Asia/Jakarta',
                })} WIB`
              : 'Menggunakan konfigurasi standar'}
          </div>
          <button type="submit" disabled={isSaving} className="btn-primary w-full sm:w-auto">
            {isSaving ? (
              <span className="spinner" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Simpan Pengaturan Jam Absen
              </>
            )}
          </button>
        </div>
      </form>

      {/* Simulator Uji Coba Jam Absen */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Simulasi Uji Coba Perhitungan</h3>
            <p className="text-xs text-slate-400">
              Uji coba jam absen masuk dan pulang untuk memastikan hasil perhitungan sesuai kebijakan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-1">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Simulasi Jam Masuk (WIB)</label>
            <input
              type="time"
              value={simIn}
              onChange={(e) => setSimIn(e.target.value)}
              className="input-field font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Simulasi Jam Pulang (WIB)</label>
            <input
              type="time"
              value={simOut}
              onChange={(e) => setSimOut(e.target.value)}
              className="input-field font-mono text-sm"
            />
          </div>
          <div
            className={`p-3.5 rounded-xl border ${
              isSimFullDay
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider opacity-80">Hasil Status:</div>
            <div className="text-base font-bold mt-0.5">
              {isSimFullDay ? 'Full Day (Satu Hari Penuh / H)' : 'Half Day (Setengah Hari / 1/2)'}
            </div>
            <div className="text-[11px] opacity-85 mt-1">{simReason}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

