'use client';

import { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, CheckCircle2, Clock, DollarSign, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { formatIDR } from '@/lib/payout-calc';
import { formatDateID } from '@/lib/utils';
import type { Batch } from '@/types';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Partial<Batch> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchBatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hrd/batches');
      if (res.status === 403) {
        window.location.href = '/hrd/dashboard';
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat data batch.');
      }
      setBatches(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openCreateModal = () => {
    const nextNumber = batches.length > 0 ? Math.max(...batches.map((b) => b.batch_number)) + 1 : 16;
    setEditingBatch({
      batch_number: nextNumber,
      name: `Batch ${nextNumber}`,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
      is_active: false,
      full_day_rate: 20000,
      half_day_rate: 10000,
      perbantuan_full_day_rate: 50000,
      perbantuan_half_day_rate: 25000,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch({ ...batch });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/hrd/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBatch),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan batch.');
      }

      setIsModalOpen(false);
      setEditingBatch(null);
      await fetchBatches();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Manajemen Batch Magang
          </h1>
          <p className="text-slate-400 text-sm">
            Atur periode waktu batch magang (standar 6 bulan) dan nominal uang saku normal vs perbantuan.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary self-start sm:self-auto flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Batch Baru
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="spinner !w-10 !h-10 text-indigo-400"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {batches.map((batch) => {
            const start = new Date(batch.start_date);
            const end = new Date(batch.end_date);
            const diffMonths = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

            return (
              <div
                key={batch.id}
                className={`glass-card p-6 relative overflow-hidden transition-all ${
                  batch.is_active ? 'border-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-950/40' : 'opacity-85'
                }`}
              >
                {batch.is_active && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Batch Aktif
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-xs uppercase font-bold text-indigo-400 tracking-wider mb-1">
                    Batch #{batch.batch_number}
                  </div>
                  <h3 className="text-xl font-bold text-white">{batch.name}</h3>
                </div>

                <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-xl border border-white/5 text-sm">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      Rentang Waktu
                    </span>
                    <span className="font-medium text-right">
                      {formatDateID(batch.start_date)} — {formatDateID(batch.end_date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 border-t border-white/5 pt-2">
                    <span className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Durasi Batch
                    </span>
                    <span className="font-medium">{diffMonths} Bulan</span>
                  </div>
                </div>

                {/* Rates comparison grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                      UANG SAKU NORMAL
                    </span>
                    <p className="text-xs text-slate-300">Full: <strong className="text-white">{formatIDR(batch.full_day_rate)}</strong></p>
                    <p className="text-xs text-slate-300">Half: <strong className="text-white">{formatIDR(batch.half_day_rate)}</strong></p>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    <span className="text-[11px] font-semibold text-amber-400 block mb-1">
                      UANG SAKU PERBANTUAN
                    </span>
                    <p className="text-xs text-slate-300">Full: <strong className="text-amber-300">{formatIDR(batch.perbantuan_full_day_rate)}</strong></p>
                    <p className="text-xs text-slate-300">Half: <strong className="text-amber-300">{formatIDR(batch.perbantuan_half_day_rate)}</strong></p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => openEditModal(batch)}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Batch & Tarif
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Edit / Tambah Batch */}
      {isModalOpen && editingBatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 animate-fade-in border-indigo-500/40 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-1">
              {editingBatch.id ? `Edit ${editingBatch.name}` : 'Tambah Batch Magang'}
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Konfigurasi nomor batch, rentang waktu periode magang, dan tarif harian.
            </p>

            {formError && (
              <div className="alert alert-error mb-4 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Nomor Batch</label>
                  <input
                    type="number"
                    required
                    value={editingBatch.batch_number || ''}
                    onChange={(e) =>
                      setEditingBatch({ ...editingBatch, batch_number: parseInt(e.target.value) || 0 })
                    }
                    className="input-field text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Nama Batch</label>
                  <input
                    type="text"
                    required
                    value={editingBatch.name || ''}
                    onChange={(e) => setEditingBatch({ ...editingBatch, name: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>Tanggal Mulai</span>
                    <span className="text-[11px] text-indigo-400 font-mono font-normal">
                      {editingBatch.start_date ? formatDateID(editingBatch.start_date) : ''}
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editingBatch.start_date || ''}
                    onChange={(e) => setEditingBatch({ ...editingBatch, start_date: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>Tanggal Selesai (6 Bulan)</span>
                    <span className="text-[11px] text-indigo-400 font-mono font-normal">
                      {editingBatch.end_date ? formatDateID(editingBatch.end_date) : ''}
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editingBatch.end_date || ''}
                    onChange={(e) => setEditingBatch({ ...editingBatch, end_date: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-slate-200 block mb-2">
                  Tarif Uang Saku Normal (Rp)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Full Day (&gt;6 Jam)</span>
                    <input
                      type="number"
                      required
                      value={editingBatch.full_day_rate || ''}
                      onChange={(e) =>
                        setEditingBatch({ ...editingBatch, full_day_rate: parseInt(e.target.value) || 0 })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Half Day (≤6 Jam)</span>
                    <input
                      type="number"
                      required
                      value={editingBatch.half_day_rate || ''}
                      onChange={(e) =>
                        setEditingBatch({ ...editingBatch, half_day_rate: parseInt(e.target.value) || 0 })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-amber-400 block mb-2">
                  Tarif Uang Saku Perbantuan (Extended Duty) (Rp)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Perbantuan Full Day</span>
                    <input
                      type="number"
                      required
                      value={editingBatch.perbantuan_full_day_rate || ''}
                      onChange={(e) =>
                        setEditingBatch({
                          ...editingBatch,
                          perbantuan_full_day_rate: parseInt(e.target.value) || 0,
                        })
                      }
                      className="input-field text-sm border-amber-500/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Perbantuan Half Day</span>
                    <input
                      type="number"
                      required
                      value={editingBatch.perbantuan_half_day_rate || ''}
                      onChange={(e) =>
                        setEditingBatch({
                          ...editingBatch,
                          perbantuan_half_day_rate: parseInt(e.target.value) || 0,
                        })
                      }
                      className="input-field text-sm border-amber-500/30"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={Boolean(editingBatch.is_active)}
                  onChange={(e) => setEditingBatch({ ...editingBatch, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="is_active" className="text-xs font-medium text-slate-300">
                  Tetapkan sebagai Batch Aktif saat ini
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-sm"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
