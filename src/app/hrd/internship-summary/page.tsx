'use client';

import { useState, useEffect } from 'react';
import {
  Award,
  Layers,
  Search,
  FileSpreadsheet,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Sparkles,
} from 'lucide-react';
import { formatDateID } from '@/lib/utils';
import type { Batch, InternshipSummaryData } from '@/types';

export default function InternshipSummaryPage() {
  const [data, setData] = useState<InternshipSummaryData | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (batchId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const bId = batchId !== undefined ? batchId : selectedBatchId;
      const url = bId
        ? `/api/hrd/internship-summary?batchId=${encodeURIComponent(bId)}`
        : '/api/hrd/internship-summary';

      const res = await fetch(url);
      if (res.status === 403) {
        window.location.href = '/hrd/dashboard';
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat Rekap Penilaian Magang.');
      }

      setData(json.data);
      setBatches(json.batches || []);
      if (!selectedBatchId && json.data?.batch?.id) {
        setSelectedBatchId(json.data.batch.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const departments = Array.from(
    new Set((data?.rows || []).map((r) => r.department))
  ).sort();

  const filteredRows = (data?.rows || []).filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.username.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || r.department === selectedDept;
    return matchesSearch && matchesDept;
  });

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
    lines.push(
      `REKAP PENILAIAN KEHADIRAN MAGANG (${data.batch.name.toUpperCase()}) - PT BPR SEHAT SEJAHTERA`
    );
    lines.push(
      `Periode Batch: ${formatDateID(data.batch.start_date)} s/d ${formatDateID(
        data.batch.end_date
      )}`
    );
    lines.push(
      `Hari Kerja Efektif: ${data.effective_working_days} Hari (Total Kalender: ${data.total_calendar_days}, Akhir Pekan: ${data.weekend_days}, Libur Nasional: ${data.holiday_days})`
    );
    lines.push('');

    const headers = [
      'NO',
      'NAMA ANAK MAGANG',
      'USERNAME',
      'BAGIAN / DIVISI',
      'STATUS',
      'HADIR PENUH (H)',
      'SETENGAH HARI (1/2)',
      'LEMBUR (HL)',
      'IZIN (I)',
      'SAKIT (S)',
      'ALPA (A)',
      'TOTAL HARI HADIR',
      'HARI KERJA EFEKTIF',
      'TOTAL JAM HADIR (JAM)',
      'DURASI FORMAT',
      'PERSENTASE KEHADIRAN (%)',
    ];
    lines.push(headers.map(escapeCsv).join(','));

    filteredRows.forEach((r, idx) => {
      const cols = [
        idx + 1,
        r.name,
        r.username,
        r.department,
        r.status === 'perbantuan' ? 'Perbantuan' : 'Aktif',
        r.full_day_count,
        r.half_day_count,
        r.overtime_count,
        r.izin_count,
        r.sakit_count,
        r.alpa_count,
        r.total_days_present,
        data.effective_working_days,
        r.total_hours,
        r.total_hours_formatted,
        `${r.attendance_percentage}%`,
      ];
      lines.push(cols.map(escapeCsv).join(','));
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `rekap-penilaian-magang-${data.batch.name.toLowerCase().replace(/\s+/g, '-')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-400" />
            Rekap Penilaian Magang
          </h1>
          <p className="text-slate-400 text-sm">
            Akumulasi <strong>Total Hari Hadir</strong> dan <strong>Total Jam Hadir</strong> setiap anak magang selama periode batch sebagai acuan penilaian akhir magang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={!data || isLoading}
            className="btn-secondary flex items-center gap-2 text-sm border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
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

      {error && (
        <div className="alert alert-error no-print">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Banner */}
      {data && (
        <div className="glass-card p-6 border-emerald-500/20 space-y-5 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Periode Acuan Penilaian: {data.batch.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Rentang Tanggal Batch:{' '}
                  <strong className="text-slate-200">{formatDateID(data.batch.start_date)}</strong> s/d{' '}
                  <strong className="text-slate-200">{formatDateID(data.batch.end_date)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Pilih Batch:</label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  fetchSummary(e.target.value);
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
                {data.total_calendar_days} <span className="text-xs font-normal text-slate-400">hari</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Durasi penuh periode batch</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-300 uppercase tracking-wider">Sabtu & Minggu</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                - {data.weekend_days} <span className="text-xs font-normal text-amber-300/70">hari</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Libur reguler akhir pekan</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs text-rose-300 uppercase tracking-wider">Libur Nasional / Cuti</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">
                - {data.holiday_days} <span className="text-xs font-normal text-rose-300/70">hari kerja</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Sesuai menu Hari Libur Nasional</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                Hari Kerja Efektif
              </p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                {data.effective_working_days} <span className="text-xs font-normal text-emerald-200">hari</span>
              </p>
              <p className="text-[11px] text-emerald-200/80 mt-1">Target 100% kehadiran magang</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-3 items-center no-print">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama anak magang, username, atau bagian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field has-icon text-sm w-full !pl-11"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="input-field text-sm !w-full md:!w-auto !bg-slate-900 !text-slate-100"
        >
          <option value="ALL">Semua Bagian / Divisi</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none">
        {data && (
          <div className="hidden print:block p-6 text-center border-b-2 border-black mb-4">
            <h2 className="text-xl font-bold uppercase">
              REKAPITULASI PENILAIAN KEHADIRAN MAGANG ({data.batch.name})
            </h2>
            <p className="text-sm font-semibold mt-1">PT BPR SEHAT SEJAHTERA</p>
            <p className="text-xs mt-1">
              Periode: {formatDateID(data.batch.start_date)} s/d {formatDateID(data.batch.end_date)} &bull; Hari Kerja Efektif: {data.effective_working_days} Hari
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="spinner !w-10 !h-10 text-emerald-400"></div>
          </div>
        ) : !data || filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Tidak ada data anak magang yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 text-xs uppercase font-semibold print:bg-slate-100 print:text-black print:border-y print:border-black">
                <tr>
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Nama Anak Magang</th>
                  <th className="py-3.5 px-4">Bagian</th>
                  <th className="py-3.5 px-3 text-center">Full (H)</th>
                  <th className="py-3.5 px-3 text-center">Half (1/2)</th>
                  <th className="py-3.5 px-3 text-center">Lembur (HL)</th>
                  <th className="py-3.5 px-3 text-center">I / S / A</th>
                  <th className="py-3.5 px-4 text-center bg-emerald-500/10 text-emerald-300 print:bg-transparent print:text-black">
                    Total Hari Hadir
                  </th>
                  <th className="py-3.5 px-4 text-center bg-cyan-500/10 text-cyan-300 print:bg-transparent print:text-black">
                    Total Jam Hadir
                  </th>
                  <th className="py-3.5 px-4 text-right">Capaian Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 print:divide-slate-300 print:text-black">
                {filteredRows.map((row, idx) => {
                  const pct = row.attendance_percentage;
                  const pctColor =
                    pct >= 85
                      ? 'text-emerald-400 bg-emerald-500'
                      : pct >= 70
                      ? 'text-amber-400 bg-amber-500'
                      : 'text-rose-400 bg-rose-500';

                  return (
                    <tr key={row.user_id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white print:text-black flex items-center gap-1.5">
                          <span>{row.name}</span>
                          {row.status === 'perbantuan' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                              <Sparkles className="w-2.5 h-2.5" />
                              Perbantuan
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">@{row.username}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-slate-200 border border-white/10 text-xs font-medium print:border-slate-300 print:text-black">
                          <Building className="w-3 h-3 text-cyan-400 no-print" />
                          {row.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-semibold text-white print:text-black">
                        {row.full_day_count}
                      </td>
                      <td className="py-3.5 px-3 text-center font-semibold text-amber-300 print:text-black">
                        {row.half_day_count}
                      </td>
                      <td className="py-3.5 px-3 text-center font-semibold text-purple-300 print:text-black">
                        {row.overtime_count > 0 ? `+${row.overtime_count}` : '0'}
                      </td>
                      <td className="py-3.5 px-3 text-center text-xs text-slate-400 font-mono print:text-black">
                        {row.izin_count} / {row.sakit_count} / {row.alpa_count}
                      </td>
                      <td className="py-3.5 px-4 text-center bg-emerald-500/[0.04] print:bg-transparent">
                        <div className="text-base font-extrabold text-emerald-400 print:text-black">
                          {row.total_days_present}{' '}
                          <span className="text-xs font-normal text-slate-400 print:text-slate-600">
                            / {data.effective_working_days} hari
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-cyan-500/[0.04] print:bg-transparent">
                        <div className="text-base font-extrabold text-cyan-300 print:text-black flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400 no-print" />
                          <span>{row.total_hours_formatted}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono print:text-slate-600">
                          ({row.total_hours} jam)
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right min-w-[140px]">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-sm font-bold ${pctColor.split(' ')[0]} print:text-black`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5 no-print">
                          <div
                            className={`h-full rounded-full ${pctColor.split(' ')[1]}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
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
    </div>
  );
}

