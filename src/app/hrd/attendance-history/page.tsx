'use client';

import { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  MapPin,
  UserCheck,
  UserX,
} from 'lucide-react';
import { formatDateID, todayISO } from '@/lib/utils';

interface AttendedItem {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  batch_name: string;
  intern_status: string;
  check_in_time: string;
  check_out_time: string | null;
  distance_from_office: number | null;
  status: string;
  attendance_status: string | null;
  notes: string | null;
}

interface NotAttendedItem {
  user_id: string;
  name: string;
  department: string;
  batch_name: string;
  attendance_status: string | null;
}

export default function AttendanceHistoryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batches, setBatches] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  
  const [attended, setAttended] = useState<AttendedItem[]>([]);
  const [notAttended, setNotAttended] = useState<NotAttendedItem[]>([]);
  const [totals, setTotals] = useState<{ interns: number; attended: number; notAttended: number }>({
    interns: 0,
    attended: 0,
    notAttended: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'attended' | 'notAttended'>('attended');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async (dateStr?: string, batchId?: string) => {
    setIsLoading(true);
    setError(null);

    const d = dateStr || selectedDate;
    const b = batchId !== undefined ? batchId : selectedBatchId;

    try {
      const url = `/api/hrd/attendance-history?date=${d}${b ? `&batchId=${b}` : ''}`;
      const res = await fetch(url);

      if (res.status === 403) {
        window.location.href = '/hrd/dashboard';
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat riwayat absensi.');
      }

      setAttended(json.data.attended || []);
      setNotAttended(json.data.notAttended || []);
      setTotals(json.data.totals || { interns: 0, attended: 0, notAttended: 0 });
      if (json.batches) {
        setBatches(json.batches);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(selectedDate, selectedBatchId);
  };

  const filteredAttended = attended.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotAttended = notAttended.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <History className="w-6 h-6 text-orange-400" />
          Riwayat Absensi Harian
        </h1>
        <p className="text-slate-400">
          Monitoring langsung log absensi anak magang yang sudah masuk maupun yang belum hadir pada hari tertentu.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Card */}
      <div className="glass-card p-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1 w-full sm:w-48">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              Pilih Tanggal
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <div className="space-y-1 w-full sm:w-56">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Filter Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Semua Batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary text-sm h-[42px] flex items-center gap-2 w-full sm:w-auto"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Tampilkan Log
          </button>

          <button
            type="button"
            onClick={() => {
              const today = todayISO();
              setSelectedDate(today);
              fetchHistory(today, selectedBatchId);
            }}
            className="btn-secondary text-xs h-[42px] px-3 w-full sm:w-auto"
          >
            Hari Ini
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totals.interns}</div>
            <div className="text-xs text-slate-400 font-medium">Total Intern Magang</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3 border-emerald-500/20">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{totals.attended}</div>
            <div className="text-xs text-slate-400 font-medium">Sudah Absen Check-in</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3 border-rose-500/20">
          <div className="w-10 h-10 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400">{totals.notAttended}</div>
            <div className="text-xs text-slate-400 font-medium">Belum Hadir / Belum Absen</div>
          </div>
        </div>
      </div>

      {/* Main List Table */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('attended')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'attended'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Sudah Absen ({totals.attended})
            </button>
            <button
              onClick={() => setActiveTab('notAttended')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'notAttended'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <UserX className="w-4 h-4" />
              Belum Absen ({totals.notAttended})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari nama atau bagian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field text-xs py-1.5"
            />
          </div>
        </div>

        <div className="text-xs text-slate-400 mb-3">
          Menampilkan catatan tanggal: <strong className="text-white">{formatDateID(selectedDate)}</strong>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-400" />
            <p className="text-xs">Memuat data absensi...</p>
          </div>
        ) : activeTab === 'attended' ? (
          filteredAttended.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Tidak ada catatan check-in untuk kriteria yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/5 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Nama & Email</th>
                    <th className="py-2.5 px-3">Bagian</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Jam Masuk</th>
                    <th className="py-2.5 px-3">Jam Pulang</th>
                    <th className="py-2.5 px-3">Status Jam</th>
                    <th className="py-2.5 px-3">Jarak GPS</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAttended.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.email}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                          {item.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{item.batch_name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                        {item.check_in_time || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-300">
                        {item.check_out_time || (
                          <span className="text-slate-500 italic">Belum checkout</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'full_day'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.status === 'half_day'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {item.distance_from_office !== null
                          ? `${Math.round(item.distance_from_office)}m`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white px-2 py-0.5 rounded bg-white/10">
                          {item.attendance_status || (item.status === 'half_day' ? '1/2' : 'H')}
                        </span>
                        {item.notes && (
                          <span className="text-[11px] text-slate-400 block mt-0.5 italic truncate max-w-[150px]" title={item.notes}>
                            {item.notes}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredNotAttended.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Semua anak magang telah melakukan check-in pada tanggal ini! 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/5 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Nama</th>
                    <th className="py-2.5 px-3">Bagian</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Status Tercatat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredNotAttended.map((u) => (
                    <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{u.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                          {u.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{u.batch_name}</td>
                      <td className="py-2.5 px-3">
                        {u.attendance_status ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                            {u.attendance_status === 'I'
                              ? 'Izin (I)'
                              : u.attendance_status === 'S'
                              ? 'Sakit (S)'
                              : u.attendance_status === 'A'
                              ? 'Alpa (A)'
                              : u.attendance_status}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Belum Ada Keterangan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
