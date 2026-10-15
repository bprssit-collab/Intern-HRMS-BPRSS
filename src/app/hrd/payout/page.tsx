'use client';

import { useState } from 'react';
import { PayoutTable } from '@/components/payout-table';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import type { PayoutSummary } from '@/types';

export default function PayoutPage() {
  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  
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

  const fetchPayoutData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!startDate || !endDate) return;
    
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/hrd/payout?startDate=${startDate}&endDate=${endDate}`);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-white mb-1">Rekap Uang Saku</h1>
        <p className="text-slate-400">Generate laporan uang saku berdasarkan rentang tanggal absensi.</p>
      </div>

      <div className="glass-card p-6 no-print">
        <form onSubmit={fetchPayoutData} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">Dari Tanggal</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex-1 w-full space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">Sampai Tanggal</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
              max={new Date().toISOString().split('T')[0]} // Cannot be in future
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary w-full sm:w-auto h-[46px]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span className="ml-2 sm:hidden">Cari Data</span>
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
