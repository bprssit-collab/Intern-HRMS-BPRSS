'use client';

import { useState, useEffect } from 'react';
import {
  CalendarOff,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  ListPlus,
  HelpCircle,
  Check,
} from 'lucide-react';
import { formatDateID, dayOfWeekISO } from '@/lib/utils';
import type { Holiday, HolidayType, Batch } from '@/types';

const DAY_NAMES_FULL = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const HOLIDAY_TYPE_LABELS: Record<HolidayType, { label: string; color: string }> = {
  national: {
    label: 'Libur Nasional',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  cuti_bersama: {
    label: 'Cuti Bersama',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  company: {
    label: 'Libur Perusahaan',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
};

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batchSummary, setBatchSummary] = useState<{
    batch: Batch;
    total_calendar_days: number;
    weekend_days: number;
    weekday_holiday_days: number;
    weekend_holiday_days: number;
    effective_working_days: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [onlyInBatchRange, setOnlyInBatchRange] = useState<boolean>(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<{
    id?: string;
    date: string;
    name: string;
    type: HolidayType;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'text' | 'table'>('text');
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState<
    { date: string; name: string; type: HolidayType }[]
  >([
    { date: '', name: '', type: 'national' },
    { date: '', name: '', type: 'national' },
    { date: '', name: '', type: 'cuti_bersama' },
  ]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const fetchHolidays = async (batchId?: string) => {
    setIsLoading(true);
    try {
      const bId = batchId !== undefined ? batchId : selectedBatchId;
      const url = bId ? `/api/hrd/holidays?batchId=${bId}` : '/api/hrd/holidays';
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat daftar hari libur.');
      }

      setHolidays(json.data || []);
      setBatches(json.batches || []);
      if (json.batchSummary) {
        setBatchSummary(json.batchSummary);
        if (!selectedBatchId && json.batchSummary.batch?.id) {
          setSelectedBatchId(json.batchSummary.batch.id);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.role === 'intern_hrd') {
          window.location.href = '/hrd/dashboard';
        }
      })
      .catch(() => {});

    fetchHolidays();
  }, []);

  const parseBulkText = (text: string) => {
    const lines = text.split('\n');
    const items: { date: string; name: string; type: HolidayType; lineNum: number; isValid: boolean; error?: string }[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      // Support comma, semicolon, or tab separation
      let parts: string[] = [];
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes(';')) {
        parts = trimmed.split(';');
      } else {
        parts = trimmed.split(',');
      }

      const datePart = (parts[0] || '').trim();
      const namePart = (parts[1] || '').trim();
      const typePart = (parts[2] || '').trim().toLowerCase();

      let type: HolidayType = 'national';
      if (typePart.includes('cuti') || typePart.includes('bersama')) {
        type = 'cuti_bersama';
      } else if (typePart.includes('company') || typePart.includes('perusahaan') || typePart.includes('internal')) {
        type = 'company';
      }

      const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(datePart);
      const isNameValid = namePart.length >= 2;

      let errorMsg = '';
      if (!isDateValid) errorMsg = 'Format tanggal harus YYYY-MM-DD';
      else if (!isNameValid) errorMsg = 'Nama hari libur belum diisi';

      items.push({
        date: datePart,
        name: namePart,
        type,
        lineNum: idx + 1,
        isValid: isDateValid && isNameValid,
        error: errorMsg,
      });
    });

    return items;
  };

  const parsedBulkPreview = parseBulkText(bulkText);
  const validBulkItems = parsedBulkPreview.filter((i) => i.isValid);

  const handleSaveBulk = async () => {
    setBulkError(null);
    let itemsToSave: { date: string; name: string; type: HolidayType }[] = [];

    if (bulkMode === 'text') {
      if (validBulkItems.length === 0) {
        setBulkError('Tidak ada baris data hari libur yang valid untuk disimpan.');
        return;
      }
      itemsToSave = validBulkItems.map((i) => ({ date: i.date, name: i.name, type: i.type }));
    } else {
      const validRows = bulkRows.filter(
        (r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date.trim()) && r.name.trim().length >= 2
      );
      if (validRows.length === 0) {
        setBulkError('Isi minimal satu baris tanggal dan nama hari libur yang lengkap.');
        return;
      }
      itemsToSave = validRows.map((r) => ({
        date: r.date.trim(),
        name: r.name.trim(),
        type: r.type,
      }));
    }

    setIsSubmittingBulk(true);
    try {
      const res = await fetch('/api/hrd/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan data massal.');
      }

      setIsBulkModalOpen(false);
      setBulkText('');
      setFeedback({
        type: 'success',
        text: json.message || `Berhasil menambahkan ${itemsToSave.length} hari libur secara massal.`,
      });
      await fetchHolidays(selectedBatchId);
    } catch (err: any) {
      setBulkError(err.message);
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const openCreateModal = () => {
    setEditingHoliday({
      date: new Date().toISOString().split('T')[0],
      name: '',
      type: 'national',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setEditingHoliday({
      id: h.id,
      date: h.date,
      name: h.name,
      type: h.type,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;

    setIsSubmitting(true);
    setFeedback(null);

    const isEdit = Boolean(editingHoliday.id);
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/hrd/holidays', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingHoliday),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan hari libur.');
      }

      setIsModalOpen(false);
      setEditingHoliday(null);
      setFeedback({
        type: 'success',
        text: json.message || 'Hari libur berhasil disimpan.',
      });
      await fetchHolidays(selectedBatchId);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (h: Holiday) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus hari libur "${h.name}" (${formatDateID(h.date)})?`
      )
    ) {
      return;
    }

    setFeedback(null);
    try {
      const res = await fetch(`/api/hrd/holidays?id=${encodeURIComponent(h.id)}&date=${encodeURIComponent(h.date)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus hari libur.');
      }
      setFeedback({ type: 'success', text: json.message });
      await fetchHolidays(selectedBatchId);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.date.includes(search);
    const matchesType = selectedType === 'ALL' || h.type === selectedType;
    const matchesBatch =
      !onlyInBatchRange ||
      !batchSummary?.batch ||
      (h.date >= batchSummary.batch.start_date && h.date <= batchSummary.batch.end_date);
    return matchesSearch && matchesType && matchesBatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <CalendarOff className="w-6 h-6 text-rose-400" />
            Hari Libur Nasional & Cuti Bersama
          </h1>
          <p className="text-slate-400 text-sm">
            Kelola tanggal libur nasional dan cuti bersama untuk menghitung jumlah{' '}
            <strong>Hari Kerja Efektif</strong> pada periode batch magang.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setBulkError(null);
              setIsBulkModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-2 text-sm border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            title="Tambah banyak hari libur sekaligus (salin teks/Excel)"
          >
            <ListPlus className="w-4 h-4 text-purple-400" />
            + Tambah Massal (Bulk)
          </button>
          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Hari Libur
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`alert ${
            feedback.type === 'success' ? 'alert-success' : 'alert-error'
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-2 text-sm">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-white underline ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Ringkasan Hari Kerja Efektif Batch */}
      {batchSummary && (
        <div className="glass-card p-6 border-emerald-500/20 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Kalkulasi Hari Kerja Efektif: {batchSummary.batch.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Periode Batch: <strong>{formatDateID(batchSummary.batch.start_date)}</strong> s/d{' '}
                  <strong>{formatDateID(batchSummary.batch.end_date)}</strong> (di luar Sabtu-Minggu & Libur Nasional/Cuti Bersama)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Pilih Batch:</label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  fetchHolidays(e.target.value);
                }}
                className="input-field text-xs !w-auto !py-1.5 !bg-slate-900 !text-slate-100"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-slate-100">
                    {b.name} {b.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Hari Kalender</p>
              <p className="text-2xl font-bold text-white mt-1">
                {batchSummary.total_calendar_days} <span className="text-xs font-normal text-slate-400">hari</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Seluruh hari dalam rentang batch</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-300 uppercase tracking-wider">Akhir Pekan (Sabtu-Minggu)</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                - {batchSummary.weekend_days} <span className="text-xs font-normal text-amber-300/70">hari</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Libur reguler akhir pekan</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs text-rose-300 uppercase tracking-wider">Libur Nasional & Cuti Bersama</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">
                - {batchSummary.weekday_holiday_days} <span className="text-xs font-normal text-rose-300/70">hari kerja</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Jatuh pada Senin–Jumat ({batchSummary.weekend_holiday_days} jatuh di akhir pekan)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                Hari Kerja Efektif Magang
              </p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                {batchSummary.effective_working_days} <span className="text-xs font-normal text-emerald-200">hari</span>
              </p>
              <p className="text-[11px] text-emerald-200/80 mt-1">
                Acuan 100% kehadiran periode batch
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama hari libur atau tanggal (YYYY-MM-DD)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field has-icon text-sm w-full !pl-11"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input-field text-sm !w-auto !bg-slate-900 !text-slate-100"
          >
            <option value="ALL">Semua Jenis Libur</option>
            <option value="national">Libur Nasional</option>
            <option value="cuti_bersama">Cuti Bersama</option>
            <option value="company">Libur Perusahaan</option>
          </select>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <input
              type="checkbox"
              checked={onlyInBatchRange}
              onChange={(e) => setOnlyInBatchRange(e.target.checked)}
              className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Hanya dalam periode {batchSummary?.batch.name || 'Batch'}</span>
          </label>
        </div>
      </div>

      {/* Holidays Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="spinner !w-10 !h-10 text-rose-400"></div>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Tidak ada data hari libur yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/5 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Hari</th>
                  <th className="py-3 px-4">Nama Hari Libur / Cuti Bersama</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Dampak Hari Kerja</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredHolidays.map((h) => {
                  const dow = dayOfWeekISO(h.date);
                  const isWeekend = dow === 0 || dow === 6;
                  const typeMeta = HOLIDAY_TYPE_LABELS[h.type] || HOLIDAY_TYPE_LABELS.national;
                  const inBatch =
                    batchSummary?.batch &&
                    h.date >= batchSummary.batch.start_date &&
                    h.date <= batchSummary.batch.end_date;

                  return (
                    <tr key={h.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-white font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-rose-400" />
                          <span>{formatDateID(h.date)}</span>
                          {inBatch && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-sans">
                              {batchSummary?.batch.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={isWeekend ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                          {DAY_NAMES_FULL[dow]}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">{h.name}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${typeMeta.color}`}
                        >
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {isWeekend ? (
                          <span className="text-slate-500">Jatuh di Akhir Pekan (Tidak mengurangi hari kerja)</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">
                            Mengurangi 1 Hari Kerja Efektif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(h)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Edit Hari Libur"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(h)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                            title="Hapus Hari Libur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Hari Libur */}
      {isModalOpen && editingHoliday && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 animate-fade-in border-rose-500/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingHoliday.id ? 'Edit Hari Libur' : 'Tambah Hari Libur Baru'}
                </h2>
                <p className="text-xs text-slate-400">
                  Masukkan tanggal dan keterangan hari libur nasional atau cuti bersama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Libur</label>
                <input
                  type="date"
                  required
                  value={editingHoliday.date}
                  onChange={(e) =>
                    setEditingHoliday({ ...editingHoliday, date: e.target.value })
                  }
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Hari Libur / Keterangan
                </label>
                <input
                  type="text"
                  required
                  value={editingHoliday.name}
                  onChange={(e) =>
                    setEditingHoliday({ ...editingHoliday, name: e.target.value })
                  }
                  placeholder="Misal: Hari Kemerdekaan Republik Indonesia"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kategori Libur</label>
                <select
                  value={editingHoliday.type}
                  onChange={(e) =>
                    setEditingHoliday({
                      ...editingHoliday,
                      type: e.target.value as HolidayType,
                    })
                  }
                  className="input-field text-sm !bg-slate-900 !text-slate-100"
                >
                  <option value="national">Hari Libur Nasional</option>
                  <option value="cuti_bersama">Cuti Bersama</option>
                  <option value="company">Libur Internal Perusahaan</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
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
                  Simpan Hari Libur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Massal (Bulk Import) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 animate-fade-in border-purple-500/40 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Tambah Jadwal Hari Libur Secara Massal
                  </h2>
                  <p className="text-xs text-slate-400">
                    Input banyak tanggal libur sekaligus tanpa perlu mengisi formulir satu per satu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkError && (
              <div className="alert alert-error text-xs mb-4 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            {/* Mode Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900/80 rounded-lg border border-white/10 mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setBulkMode('text')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                  bulkMode === 'text'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Metode 1: Salin/Tempel Teks (Excel / Format Baris)
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('table')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                  bulkMode === 'table'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Metode 2: Input Baris Cepat
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {bulkMode === 'text' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Tempelkan Baris Data Libur:</span>
                      <span className="text-[11px] text-purple-300 font-normal">
                        Format: <code className="bg-white/10 px-1 py-0.5 rounded">YYYY-MM-DD, Nama Libur, Kategori</code>
                      </span>
                    </label>
                    <textarea
                      rows={6}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={`Contoh salinan Excel / teks:
2027-01-01, Tahun Baru 2027 Masehi, national
2027-02-05, Cuti Bersama Imlek, cuti_bersama
2027-02-06, Tahun Baru Imlek 2578, national
2027-03-24, Hari Suci Nyepi, national`}
                      className="input-field text-xs font-mono w-full resize-none leading-relaxed"
                    />
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>
                        Pemisah kolom dapat berupa koma (,), titik koma (;), atau tab (salin langsung dari kolom Excel). Kategori: <strong>national</strong> (default), <strong>cuti_bersama</strong>, atau <strong>company</strong>.
                      </span>
                    </div>
                  </div>

                  {/* Live Preview parsed items */}
                  {parsedBulkPreview.length > 0 && (
                    <div className="space-y-2 border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Pratinjau Hasil Pembacaan:</span>
                        <span className="text-emerald-400 font-medium">
                          {validBulkItems.length} baris valid siap disimpan
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5 bg-slate-900/50 text-xs">
                        {parsedBulkPreview.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2 flex items-center justify-between gap-3 ${
                              item.isValid ? 'text-slate-200' : 'bg-rose-500/10 text-rose-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] text-slate-500 w-5">
                                #{item.lineNum}
                              </span>
                              <span className="font-mono font-semibold text-white whitespace-nowrap">
                                {item.date || '(kosong)'}
                              </span>
                              <span className="truncate">&bull; {item.name || '(kosong)'}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.isValid ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] border ${
                                    HOLIDAY_TYPE_LABELS[item.type]?.color ||
                                    HOLIDAY_TYPE_LABELS.national.color
                                  }`}
                                >
                                  {HOLIDAY_TYPE_LABELS[item.type]?.label || item.type}
                                </span>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-medium">
                                  {item.error}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Mode 2: Multi-row Table */
                <div className="space-y-3">
                  <div className="space-y-2">
                    {bulkRows.map((row, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5"
                      >
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => {
                            const newRows = [...bulkRows];
                            newRows[index].date = e.target.value;
                            setBulkRows(newRows);
                          }}
                          className="input-field text-xs sm:w-36 font-mono"
                          required
                        />
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => {
                            const newRows = [...bulkRows];
                            newRows[index].name = e.target.value;
                            setBulkRows(newRows);
                          }}
                          placeholder="Nama Hari Libur / Keterangan"
                          className="input-field text-xs flex-1"
                          required
                        />
                        <select
                          value={row.type}
                          onChange={(e) => {
                            const newRows = [...bulkRows];
                            newRows[index].type = e.target.value as HolidayType;
                            setBulkRows(newRows);
                          }}
                          className="input-field text-xs sm:w-36 !bg-slate-900 !text-slate-100"
                        >
                          <option value="national">Libur Nasional</option>
                          <option value="cuti_bersama">Cuti Bersama</option>
                          <option value="company">Libur Perusahaan</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (bulkRows.length > 1) {
                              setBulkRows(bulkRows.filter((_, i) => i !== index));
                            }
                          }}
                          disabled={bulkRows.length <= 1}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded disabled:opacity-30 transition-colors"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBulkRows([
                          ...bulkRows,
                          { date: '', name: '', type: 'national' },
                        ])
                      }
                      className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Tambah 1 Baris
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBulkRows([
                          ...bulkRows,
                          { date: '', name: '', type: 'national' },
                          { date: '', name: '', type: 'national' },
                          { date: '', name: '', type: 'national' },
                        ])
                      }
                      className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Tambah 3 Baris
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 mt-4 border-t border-white/10 shrink-0">
              <div className="text-xs text-slate-400">
                {bulkMode === 'text'
                  ? `${validBulkItems.length} baris siap disimpan`
                  : `${
                      bulkRows.filter((r) => r.date && r.name).length
                    } baris terisi`}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="btn-secondary text-xs"
                  disabled={isSubmittingBulk}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulk}
                  disabled={
                    isSubmittingBulk ||
                    (bulkMode === 'text' && validBulkItems.length === 0)
                  }
                  className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingBulk ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Simpan Semua Hari Libur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

