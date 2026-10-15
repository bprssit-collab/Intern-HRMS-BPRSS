'use client';

import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Printer,
  Edit3,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  Download,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  X,
} from 'lucide-react';
import { formatDateID, getDefaultRecapRange } from '@/lib/utils';
import { getAttendanceEditPolicy } from '@/lib/permissions';
import type { AttendanceRecapData, AttendanceCode, Batch, UserRole } from '@/types';

export default function AttendanceRecapPage() {
  const [data, setData] = useState<AttendanceRecapData | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // Default range: 2 weeks (Monday of current week to Sunday of next week)
  const defaultRange = getDefaultRecapRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Super Admin state & feedback
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string } | null>(null);
  const [todayModalOpen, setTodayModalOpen] = useState(false);
  const [todayAttendances, setTodayAttendances] = useState<any[]>([]);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [isDeletingAttendance, setIsDeletingAttendance] = useState(false);
  const [recapFeedback, setRecapFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Cell Modal State
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    date: string;
    initialCode: AttendanceCode | null;
    currentCode: AttendanceCode | null;
    currentNotes: string;
    editCount: number;
    hasCheckedIn: boolean;
  } | null>(null);
  const [isSavingCell, setIsSavingCell] = useState(false);

  const fetchRecap = async (batchId?: string, sDate?: string, eDate?: string) => {
    setIsLoading(true);
    setError(null);

    const bId = batchId !== undefined ? batchId : selectedBatchId;
    const start = sDate || startDate;
    const end = eDate || endDate;

    try {
      const url = `/api/hrd/attendance-recap?batchId=${bId}&startDate=${start}&endDate=${end}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat rekap absensi.');
      }

      setData(json.data);
      setBatches(json.batches || []);
      if (json.data?.batch?.id && !selectedBatchId) {
        setSelectedBatchId(json.data.batch.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecap();
    // Fetch Current User
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.error('Error fetching current user:', err));
  }, []);

  const fetchTodayAttendances = async () => {
    setIsLoadingToday(true);
    try {
      const res = await fetch('/api/admin/reset-attendance-today');
      const json = await res.json();
      if (json.success) {
        setTodayAttendances(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching today attendances:', err);
    } finally {
      setIsLoadingToday(false);
    }
  };

  const handleDeleteAttendance = async (userId: string, date?: string, userName?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = date || todayStr;
    const confirmMessage = `Apakah Anda yakin ingin MENGHAPUS data absensi ${
      userName ? `untuk "${userName}"` : ''
    } pada tanggal ${targetDate}?\n\nSetelah dihapus, anak magang dapat melakukan absen ulang pada hari tersebut.`;

    if (!window.confirm(confirmMessage)) return;

    setIsDeletingAttendance(true);
    setRecapFeedback(null);

    try {
      const res = await fetch('/api/admin/reset-attendance-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, date: targetDate }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus data absensi.');
      }

      setRecapFeedback({ type: 'success', text: json.message });
      if (editModal) setEditModal(null);

      // Refresh both recap matrix and today attendances
      await fetchRecap(selectedBatchId, startDate, endDate);
      if (todayModalOpen) {
        await fetchTodayAttendances();
      }
    } catch (err: any) {
      setRecapFeedback({ type: 'error', text: err.message });
    } finally {
      setIsDeletingAttendance(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecap(selectedBatchId, startDate, endDate);
  };

  const handleResetToCurrentWeeks = () => {
    const range = getDefaultRecapRange();
    setStartDate(range.start);
    setEndDate(range.end);
    fetchRecap(selectedBatchId, range.start, range.end);
  };

  const openEditModal = (userId: string, userName: string, date: string, cell: any) => {
    const isAttended = Boolean(cell?.has_checked_in || cell?.code === 'H' || cell?.code === '1/2');
    setEditModal({
      isOpen: true,
      userId,
      userName,
      date,
      initialCode: cell?.code || null,
      currentCode: cell?.code || null,
      currentNotes: cell?.notes || '',
      editCount: cell?.edit_count || 0,
      hasCheckedIn: isAttended,
    });
  };

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    // Check policy before sending
    const policy = getAttendanceEditPolicy(currentUser?.role as any, {
      attended: editModal.hasCheckedIn,
      editCount: editModal.editCount,
    });

    if (!policy.allowed) {
      alert(policy.message);
      return;
    }

    if (policy.requireNotes && !editModal.currentNotes.trim()) {
      alert('Keterangan wajib diisi untuk status izin, sakit, atau alpa.');
      return;
    }

    if (policy.oneTimeOnly) {
      const confirmSave = window.confirm(
        'Perhatian: Perubahan status ini HANYA DAPAT DILAKUKAN 1 KALI. Setelah disimpan, status akan terkunci dan tidak dapat diubah lagi oleh role Anda.\n\nApakah Anda yakin ingin menyimpan?'
      );
      if (!confirmSave) return;
    }

    setIsSavingCell(true);
    try {
      const res = await fetch('/api/hrd/attendance-recap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editModal.userId,
          date: editModal.date,
          attendance_status: editModal.currentCode,
          notes: editModal.currentNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan status absensi.');
      }

      setEditModal(null);
      await fetchRecap(selectedBatchId, startDate, endDate);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingCell(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];
    lines.push(`ABSENSI MAGANG MAHASISWA ${data.batch.name.toUpperCase()} PT BPR SEHAT SEJAHTERA`);
    lines.push(`Periode: ${data.startDate} s/d ${data.endDate}`);
    lines.push('');

    // Header columns
    const headerCols = [
      'NO',
      'NAMA MAHASISWA',
      'BAGIAN',
      'STATUS',
      ...data.dateList.map((d) => `${d.dayName} ${d.date.split('-')[2]}/${d.date.split('-')[1]}`),
      'H',
      'S',
      'I',
      'A',
      'FULL',
      '1/2',
      'KETERANGAN RINCI',
    ];
    lines.push(headerCols.map(escapeCsv).join(','));

    let rowIdx = 1;
    for (const group of data.departments) {
      for (const row of group.rows) {
        const rowCols = [
          rowIdx++,
          row.name,
          row.department,
          row.status === 'perbantuan' ? 'Perbantuan' : 'Aktif',
          ...data.dateList.map((d) => row.cells[d.date]?.code || '-'),
          row.summary.H,
          row.summary.S,
          row.summary.I,
          row.summary.A,
          row.summary.Full,
          row.summary.Half,
          row.notesList.join('; '),
        ];
        lines.push(rowCols.map(escapeCsv).join(','));
      }
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `rekap-absensi-${data.batch.name.toLowerCase().replace(/\s+/g, '-')}-${data.startDate}-sd-${data.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Control bar / Filter (hidden during print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-amber-400" />
              Rekap Absensi Magang Mahasiswa
            </h1>
            <p className="text-slate-400 text-sm">
              Tampilan matriks kehadiran horizontal sesuai format resmi PT BPR Sehat Sejahtera.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* Super Admin Quick Action */}
            {currentUser?.role === 'super_admin' && (
              <button
                onClick={() => {
                  setTodayModalOpen(true);
                  fetchTodayAttendances();
                }}
                className="btn-secondary flex items-center gap-1.5 text-sm border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                title="Kelola & Hapus Absensi Hari Berjalan (Super Admin)"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Hapus Absen Hari Ini
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={!data || isLoading}
              className="btn-secondary flex items-center gap-2 text-sm border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
              title="Unduh format spreadsheet CSV/Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Ekspor Excel (CSV)
            </button>
            <button
              onClick={handlePrint}
              disabled={!data || isLoading}
              className="btn-secondary flex items-center gap-2 text-sm border-white/20 hover:border-white/40 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              Cetak / PDF
            </button>
          </div>
        </div>

        {recapFeedback && (
          <div
            className={`alert ${
              recapFeedback.type === 'success' ? 'alert-success' : 'alert-error'
            } flex items-center justify-between`}
          >
            <div className="flex items-center gap-2 text-sm">
              {recapFeedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <span>{recapFeedback.text}</span>
            </div>
            <button
              onClick={() => setRecapFeedback(null)}
              className="text-xs text-slate-400 hover:text-white underline ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Filter Card */}
        <div className="glass-card p-4">
          <form onSubmit={handleFilterSubmit} className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="space-y-1 w-full lg:w-48">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Pilih Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="input-field text-sm"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 w-full lg:w-40">
              <label className="text-xs font-semibold text-slate-300">Dari Tanggal</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <div className="space-y-1 w-full lg:w-40">
              <label className="text-xs font-semibold text-slate-300">Sampai Tanggal</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <button type="submit" className="btn-primary text-sm h-[42px] flex items-center gap-2 flex-1 lg:flex-initial">
                <Search className="w-4 h-4" />
                Filter Rekap
              </button>

              <button
                type="button"
                onClick={handleResetToCurrentWeeks}
                className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                title="Tampilkan 2 minggu berjalan (Senin minggu ini s/d Minggu minggu depan)"
              >
                2 Minggu Berjalan
              </button>
            </div>
          </form>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Petunjuk Kode:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-white text-slate-900 font-bold rounded flex items-center justify-center text-[10px]">H</span>
              Hadir Penuh
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-emerald-500 text-white font-bold rounded flex items-center justify-center text-[10px]">1/2</span>
              Setengah Hari
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-sky-400 text-slate-950 font-bold rounded flex items-center justify-center text-[10px]">I</span>
              Izin
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-400 text-slate-950 font-bold rounded flex items-center justify-center text-[10px]">S</span>
              Sakit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-red-500 text-white font-bold rounded flex items-center justify-center text-[10px]">A</span>
              Alpa / Tanpa Ket.
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-300/90 rounded border border-amber-400"></span>
              Akhir Pekan / Libur
            </span>
            <span className="text-slate-500 italic ml-auto">
              * Klik pada sel tanggal untuk mengubah status kehadiran atau menambah catatan.
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SPREADSHEET MATRIX TABLE */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="spinner !w-12 !h-12 text-amber-400"></div>
        </div>
      ) : !data || data.departments.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 text-sm">
          Tidak ada data kehadiran yang ditemukan untuk kriteria filter ini.
        </div>
      ) : (
        <div className="glass-card overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
          {/* Document Header (Always visible & styled prominently for printing) */}
          <div className="p-6 text-center border-b border-white/10 bg-slate-900/60 print:bg-white print:text-black print:border-b-2 print:border-black">
            <h2 className="text-lg md:text-xl font-bold tracking-widest uppercase text-white print:text-black">
              ABSENSI MAGANG MAHASISWA
            </h2>
            <h3 className="text-base font-extrabold text-amber-400 print:text-black uppercase tracking-wider my-1">
              {data.batch.name}
            </h3>
            <h4 className="text-sm font-semibold tracking-wider text-slate-300 print:text-black">
              PT BPR SEHAT SEJAHTERA
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse border border-slate-700 print:border-black text-xs">
              {/* Header Row 1: Weeks Grouping */}
              <thead>
                <tr className="bg-slate-800/90 text-slate-200 print:bg-slate-100 print:text-black">
                  <th
                    rowSpan={2}
                    className="border border-slate-700 print:border-black px-3 py-2 text-left font-bold w-28 bg-slate-800/60 print:bg-slate-200"
                  >
                    BAGIAN
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-700 print:border-black px-3 py-2 text-left font-bold w-48 bg-slate-800/60 print:bg-slate-200"
                  >
                    NAMA
                  </th>

                  {/* Weeks columns */}
                  {data.weeks.map((w, idx) => (
                    <th
                      key={idx}
                      colSpan={w.dateCount}
                      className="border border-slate-700 print:border-black px-2 py-1.5 font-bold uppercase tracking-wider bg-slate-800 print:bg-slate-200"
                    >
                      {w.label}
                    </th>
                  ))}

                  {/* Keterangan Summary Header */}
                  <th
                    colSpan={6}
                    className="border border-slate-700 print:border-black px-2 py-1.5 font-bold uppercase tracking-wider bg-amber-400 text-slate-950 print:bg-amber-300"
                  >
                    KETERANGAN
                  </th>

                  {/* Keterangan Rinci Header */}
                  <th
                    rowSpan={2}
                    className="border border-slate-700 print:border-black px-4 py-2 font-bold uppercase tracking-wider min-w-[200px] text-left bg-sky-600 text-white print:bg-sky-200 print:text-black"
                  >
                    KETERANGAN RINCI
                  </th>
                </tr>

                {/* Header Row 2: Date Columns & Summary Codes */}
                <tr className="bg-slate-800/60 text-slate-300 print:bg-slate-50 print:text-black text-[11px]">
                  {/* Dates columns */}
                  {data.dateList.map((d) => (
                    <th
                      key={d.date}
                      className={`border border-slate-700 print:border-black px-1.5 py-1.5 font-semibold min-w-[34px] ${
                        d.is_weekend
                          ? 'bg-amber-300/90 text-slate-950 print:bg-yellow-300'
                          : 'bg-slate-800 print:bg-slate-100 text-slate-200 print:text-black'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono leading-none">
                        {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                      </div>
                    </th>
                  ))}

                  {/* Summary columns */}
                  <th className="border border-slate-700 print:border-black w-7 py-1.5 font-bold bg-orange-500 text-white">H</th>
                  <th className="border border-slate-700 print:border-black w-7 py-1.5 font-bold bg-amber-400 text-slate-950">S</th>
                  <th className="border border-slate-700 print:border-black w-7 py-1.5 font-bold bg-cyan-400 text-slate-950">I</th>
                  <th className="border border-slate-700 print:border-black w-7 py-1.5 font-bold bg-red-600 text-white">A</th>
                  <th className="border border-slate-700 print:border-black w-8 py-1.5 font-bold bg-slate-700 text-white print:bg-slate-200 print:text-black">Full</th>
                  <th className="border border-slate-700 print:border-black w-8 py-1.5 font-bold bg-emerald-700 text-white print:bg-emerald-200 print:text-black">1/2</th>
                </tr>
              </thead>

              {/* Table Body Grouped by Department */}
              <tbody>
                {data.departments.map((deptGroup) => {
                  return deptGroup.rows.map((row, rowIdx) => {
                    const isFirstInDept = rowIdx === 0;

                    return (
                      <tr
                        key={row.user_id}
                        className="hover:bg-white/[0.04] transition-colors print:hover:bg-transparent"
                      >
                        {/* Department cell with rowSpan */}
                        {isFirstInDept && (
                          <td
                            rowSpan={deptGroup.rows.length}
                            className="border border-slate-700 print:border-black px-3 py-2 text-left font-bold text-white print:text-black bg-slate-900/90 print:bg-slate-50 align-middle"
                          >
                            <span className="block">{deptGroup.department}</span>
                          </td>
                        )}

                        {/* Name Cell */}
                        <td className="border border-slate-700 print:border-black px-3 py-2 text-left font-medium text-slate-200 print:text-black whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{row.name}</span>
                            {row.status === 'perbantuan' && (
                              <span
                                className="no-print px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold"
                                title="Masa Perbantuan"
                              >
                                P
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date cells */}
                        {data.dateList.map((d) => {
                          const cell = row.cells[d.date];
                          const code = cell?.code;

                          if (d.is_weekend) {
                            return (
                              <td
                                key={d.date}
                                className="border border-slate-700 print:border-black p-0 bg-amber-300/80 print:bg-yellow-300 text-slate-900"
                              >
                                {/* Yellow weekend column */}
                              </td>
                            );
                          }

                          return (
                            <td
                              key={d.date}
                              onClick={() => openEditModal(row.user_id, row.name, d.date, cell)}
                              className="border border-slate-700 print:border-black p-0 cursor-pointer hover:bg-white/10 transition-colors select-none font-bold text-xs"
                              title={`${row.name} (${d.date}): ${code || 'Belum ada data'}. Klik untuk ubah.`}
                            >
                              {code === 'H' && (
                                <span className="inline-block w-full py-1.5 text-white font-extrabold">H</span>
                              )}
                              {code === '1/2' && (
                                <span className="inline-block w-full py-1.5 bg-emerald-600/90 text-white font-extrabold print:bg-emerald-300 print:text-black">
                                  1/2
                                </span>
                              )}
                              {code === 'I' && (
                                <span className="inline-block w-full py-1.5 bg-sky-400 text-slate-950 font-extrabold print:bg-sky-300 print:text-black">
                                  I
                                </span>
                              )}
                              {code === 'S' && (
                                <span className="inline-block w-full py-1.5 bg-amber-400 text-slate-950 font-extrabold print:bg-yellow-300 print:text-black">
                                  S
                                </span>
                              )}
                              {code === 'A' && (
                                <span className="inline-block w-full py-1.5 bg-red-600 text-white font-extrabold print:bg-red-400">
                                  A
                                </span>
                              )}
                              {!code && <span className="text-slate-600 print:text-slate-300">-</span>}
                            </td>
                          );
                        })}

                        {/* Summary Counts */}
                        <td className="border border-slate-700 print:border-black py-2 font-bold text-slate-200 print:text-black">
                          {row.summary.H}
                        </td>
                        <td className="border border-slate-700 print:border-black py-2 font-bold text-slate-200 print:text-black">
                          {row.summary.S}
                        </td>
                        <td className="border border-slate-700 print:border-black py-2 font-bold text-slate-200 print:text-black">
                          {row.summary.I}
                        </td>
                        <td className="border border-slate-700 print:border-black py-2 font-bold text-slate-200 print:text-black">
                          {row.summary.A}
                        </td>
                        <td className="border border-slate-700 print:border-black py-2 font-bold text-slate-200 print:text-black">
                          {row.summary.Full}
                        </td>
                        <td className="border border-slate-700 print:border-black py-2 font-bold text-slate-200 print:text-black">
                          {row.summary.Half}
                        </td>

                        {/* Keterangan Rinci Column */}
                        <td className="border border-slate-700 print:border-black px-3 py-2 text-left text-[11px] text-slate-300 print:text-black font-normal">
                          {row.notesList && row.notesList.length > 0 ? (
                            <span className="line-clamp-2" title={row.notesList.join('; ')}>
                              {row.notesList.join('; ')}
                            </span>
                          ) : (
                            <span className="text-slate-600 print:text-transparent">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL QUICK EDIT CELL ATTENDANCE & NOTES */}
      {editModal && editModal.isOpen && (() => {
        const policy = getAttendanceEditPolicy(currentUser?.role as any, {
          attended: editModal.hasCheckedIn,
          editCount: editModal.editCount,
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card max-w-sm w-full p-6 animate-fade-in border-amber-500/40">
              <h3 className="text-lg font-bold text-white mb-1">Update Status Absensi</h3>
              <p className="text-slate-400 text-xs mb-3">
                {editModal.userName} &bull; <strong className="text-amber-400">{formatDateID(editModal.date)}</strong>
              </p>

              {!policy.allowed ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 text-rose-200">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Akses Ubah Terkunci
                    </div>
                    <p className="leading-relaxed">{policy.message}</p>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditModal(null)}
                      className="btn-secondary text-xs"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveCell} className="space-y-4">
                  {policy.oneTimeOnly && (
                    <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <span>{policy.message}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      Pilih Kode Kehadiran
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { code: 'H', label: 'Hadir', bg: 'bg-white text-slate-950 font-bold' },
                        { code: '1/2', label: '1/2 Hari', bg: 'bg-emerald-600 text-white font-bold' },
                        { code: 'I', label: 'Izin', bg: 'bg-sky-400 text-slate-950 font-bold' },
                        { code: 'S', label: 'Sakit', bg: 'bg-amber-400 text-slate-950 font-bold' },
                        { code: 'A', label: 'Alpa', bg: 'bg-red-600 text-white font-bold' },
                      ].map((item) => {
                        const isAllowed = policy.allowedCodes.includes(item.code as AttendanceCode);
                        if (!isAllowed) return null;

                        return (
                          <button
                            type="button"
                            key={item.code}
                            onClick={() =>
                              setEditModal({
                                ...editModal,
                                currentCode: editModal.currentCode === item.code ? null : (item.code as AttendanceCode),
                              })
                            }
                            className={`h-11 rounded-lg flex flex-col items-center justify-center text-xs transition-all border ${
                              editModal.currentCode === item.code
                                ? `${item.bg} ring-2 ring-white border-transparent shadow-lg scale-105`
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                            }`}
                          >
                            <span className="font-extrabold">{item.code}</span>
                            <span className="text-[9px] opacity-80">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Keterangan Rinci {policy.requireNotes ? <span className="text-rose-400 font-bold">*Wajib Diisi</span> : <span className="text-slate-500 font-normal">(Opsional)</span>}</span>
                    </label>
                    <textarea
                      rows={3}
                      required={policy.requireNotes}
                      value={editModal.currentNotes}
                      onChange={(e) => setEditModal({ ...editModal, currentNotes: e.target.value })}
                      placeholder={
                        policy.requireNotes
                          ? 'Wajib diisi alasan sakit, izin, atau alpa...'
                          : 'Misal: Masuk kuliah dan ada rapat prodi / Pembekalan...'
                      }
                      className="input-field text-xs w-full resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                {/* Super Admin: Delete today's attendance record */}
                {currentUser?.role === 'super_admin' &&
                editModal.date === new Date().toISOString().split('T')[0] &&
                editModal.currentCode !== null ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteAttendance(editModal.userId, editModal.date, editModal.userName)}
                    disabled={isSavingCell || isDeletingAttendance}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Hapus rekaman absensi hari ini agar intern dapat absen ulang"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Hapus Absen Hari Ini</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModal(null)}
                    className="btn-secondary text-xs"
                    disabled={isSavingCell || isDeletingAttendance}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCell || isDeletingAttendance}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    {isSavingCell ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Simpan Status
                  </button>
                </div>
              </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL KELOLA & HAPUS ABSENSI HARI INI (SUPER ADMIN ONLY) */}
      {todayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 animate-fade-in border-rose-500/40 shadow-2xl shadow-rose-950/40">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Kelola Absensi Hari Berjalan
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      SUPER ADMIN
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Tanggal:{' '}
                    <strong className="text-cyan-300">
                      {formatDateID(new Date().toISOString().split('T')[0])}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTodayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300 text-xs mb-4">
              Daftar anak magang yang telah mencatatkan absensi hari ini. Menghapus data absensi memungkinkan anak magang bersangkutan untuk <strong>melakukan absen ulang dari awal</strong> (misal terjadi kesalahan foto wajah, salah jam, atau keluhan check-in).
            </p>

            {isLoadingToday ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-rose-400" />
                <p className="text-xs">Memuat data absensi hari ini...</p>
              </div>
            ) : todayAttendances.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-white/[0.02] rounded-lg border border-white/5">
                <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-medium">Belum ada anak magang yang melakukan absensi hari ini.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                {todayAttendances.map((att: any) => (
                  <div
                    key={att.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white text-sm flex items-center gap-2">
                        {att.user_name}
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {att.department}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {att.user_email}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-3">
                        <span>Masuk: <strong className="text-emerald-400 font-mono">{att.check_in_time || '-'}</strong></span>
                        <span>Pulang: <strong className="text-amber-400 font-mono">{att.check_out_time || '-'}</strong></span>
                        <span>Status: <strong className="text-cyan-300 uppercase">{att.status || att.attendance_status || '-'}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAttendance(att.user_id, att.date, att.user_name)}
                      disabled={isDeletingAttendance}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      Hapus Absen
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 mt-4 border-t border-white/10">
              <button
                type="button"
                onClick={fetchTodayAttendances}
                disabled={isLoadingToday}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Segarkan Daftar
              </button>
              <button
                type="button"
                onClick={() => setTodayModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
