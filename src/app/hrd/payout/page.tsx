'use client';

import { useState, useEffect } from 'react';
import { PayoutTable } from '@/components/payout-table';
import { Search, Loader2, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import type { PayoutSummary } from '@/types';
import {
  getDefaultPayoutRange,
  getCurrentCalendarMonthRange,
  formatDateID,
} from '@/lib/utils';

export default function PayoutPage() {
  // Default: rentang 1 bulan berdasarkan tanggal berjalan (e.g. 1 bulan ke belakang s/d hari ini)
  const defaultRange = getDefaultPayoutRange();

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const [data, setData] = useState<PayoutSummary[] | null>(null);
  const [period, setPeriod] = useState<{ startDate: string; endDate: string } | null>(null);
  const [settings, setSettings] = useState<{
    full_day_rate: number;
    half_day_rate: number;
    perbantuan_full_day_rate?: number;
    perbantuan_half_day_rate?: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayoutData = async (sDate?: string, eDate?: string) => {
    const s = sDate || startDate;
    const e = eDate || endDate;
    if (!s || !e) return;

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/hrd/payout?startDate=${s}&endDate=${e}`);
      if (res.status === 403) {
        window.location.href = '/hrd/dashboard';
        return;
      }
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat data payout.');
      }

      setData(json.data.payouts);
      setSettings(json.data.settings);
      setPeriod(json.data.period);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load automatically on mount with default 1-month range
  useEffect(() => {
    fetchPayoutData(defaultRange.start, defaultRange.end);
  }, []);

  const handleApplyPreset = (range: { start: string; end: string }) => {
    setStartDate(range.start);
    setEndDate(range.end);
    fetchPayoutData(range.start, range.end);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayoutData(startDate, endDate);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-400" />
          Rekap Uang Saku
        </h1>
        <p className="text-slate-400 text-sm">
          Generate laporan akumulasi uang saku magang & perbantuan berdasarkan rentang tanggal kehadiran.
        </p>
      </div>

      <div className="glass-card p-6 no-print space-y-4">
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Periode Terpilih:</span>
            <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold font-mono text-xs">
              {formatDateID(startDate)} s/d {formatDateID(endDate)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset(getDefaultPayoutRange())}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              1 Bulan Berjalan (Default)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(getCurrentCalendarMonthRange())}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition-colors"
            >
              Bulan Kalender Ini
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1">Dari Tanggal</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1">Sampai Tanggal</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full sm:w-auto h-[46px] flex items-center gap-2 text-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Cari Data</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error no-print">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center p-12 no-print">
          <div className="spinner !w-10 !h-10 text-emerald-400"></div>
        </div>
      )}

      {data && settings && period && !isLoading && (
        <div className="mt-8">
          <PayoutTable data={data} settings={settings} period={period} />
        </div>
      )}
    </div>
  );
}
