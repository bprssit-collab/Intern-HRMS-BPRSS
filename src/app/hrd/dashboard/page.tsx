import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { Users, UserCheck, CalendarDays, Layers, UserCog, Table, FileSpreadsheet, ArrowRight, ShieldAlert } from 'lucide-react';
import { todayISO, formatDateID } from '@/lib/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HrdDashboard() {
  const session = await getSession();
  if (!session) redirect('/');

  const supabase = createAdminClient();
  const today = todayISO();

  // Fetch total interns
  const { count: totalInterns } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'intern');

  // Fetch perbantuan interns
  const { count: perbantuanCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'intern')
    .eq('status', 'perbantuan');

  // Fetch active batch
  const { data: activeBatch } = await supabase
    .from('batches')
    .select('*')
    .eq('is_active', true)
    .single();

  // Fetch today's attendance count
  const { count: todayAttendance } = await supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('date', today);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard HRD</h1>
          <p className="text-slate-400">Monitoring absensi magang, perbantuan, dan periode batch aktif PT BPR Sehat Sejahtera.</p>
        </div>
        {activeBatch && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium w-fit">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Aktif: <strong>{activeBatch.name}</strong></span>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Intern</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalInterns || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Terdaftar di sistem</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-2xl shrink-0">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Hadir Hari Ini</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {todayAttendance || 0} <span className="text-sm font-normal text-slate-500">/ {totalInterns || 0}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Presensi tanggal {formatDateID(today)}</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3.5 bg-purple-500/10 text-purple-400 rounded-2xl shrink-0">
            <UserCog className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Masa Perbantuan</p>
            <p className="text-2xl font-bold text-purple-300 mt-0.5">{perbantuanCount || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Tarif uang saku khusus</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Batch Magang</p>
            <p className="text-lg font-bold text-white mt-0.5 truncate">{activeBatch ? activeBatch.name : 'Batch 15'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {activeBatch ? `${formatDateID(activeBatch.start_date)} s/d ${formatDateID(activeBatch.end_date)}` : '6 Bulan'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Akses Cepat Modul HRD</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/hrd/attendance-recap"
            className="glass-card p-6 group hover:border-emerald-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                Rekap Absensi Matrix
              </h3>
              <p className="text-sm text-slate-400">
                Format spreadsheet resmi per bagian (Minggu 5 & 6, weekend kuning, kode H, 1/2, I, S, A, dan catatan rinci).
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mt-5">
              <span>Buka Rekap</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/hrd/interns"
            className="glass-card p-6 group hover:border-blue-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                Data Anak Magang
              </h3>
              <p className="text-sm text-slate-400">
                Kelola daftar anak magang, penempatan bagian (CS, Teller, SDM, dll), dan toggle status Masa Perbantuan.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mt-5">
              <span>Lihat Daftar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/hrd/batches"
            className="glass-card p-6 group hover:border-amber-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1 group-hover:text-amber-300 transition-colors">
                Manajemen Batch
              </h3>
              <p className="text-sm text-slate-400">
                Atur siklus batch magang (Batch 15, durasi 6 bulan), rentang tanggal, dan tarif uang saku perbantuan khusus.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mt-5">
              <span>Kelola Batch</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Guide Card */}
      <div className="glass-card p-6 border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-xl text-slate-300 shrink-0 mt-0.5">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Siklus Magang PT BPR Sehat Sejahtera</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Anak magang yang telah menyelesaikan periode normal 6 bulan dapat diubah statusnya menjadi <strong>Perbantuan</strong> di menu Data Anak Magang. Perhitungan uang saku akan otomatis menerapkan nominal tarif perbantuan yang telah diatur pada menu Batch/Pengaturan.
            </p>
          </div>
        </div>
        <Link
          href="/hrd/payout"
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all whitespace-nowrap shadow-lg shadow-emerald-950/40"
        >
          Hitung Uang Saku
        </Link>
      </div>
    </div>
  );
}
