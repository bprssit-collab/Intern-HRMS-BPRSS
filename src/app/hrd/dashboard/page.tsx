import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { MANAGER_ROLES } from '@/lib/permissions';
import {
  Users,
  UserCheck,
  CalendarDays,
  Layers,
  UserCog,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  ScanFace,
  AlertCircle,
  Calendar,
  History,
  Award,
} from 'lucide-react';
import { todayISO, formatDateID, formatTime, statusLabel, statusColor, cn } from '@/lib/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HrdDashboard() {
  const session = await getSession();
  if (!session) redirect('/');

  const isInternHrd = session.role === 'intern_hrd';
  const isManager = MANAGER_ROLES.includes(session.role);

  const supabase = createAdminClient();
  const today = todayISO();

  // Fetch total interns
  const { count: totalInterns } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .in('role', ['intern', 'intern_hrd']);

  // Fetch perbantuan interns
  const { count: perbantuanCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .in('role', ['intern', 'intern_hrd'])
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

  // If intern_hrd, also fetch personal face status & personal attendance records
  let needsFaceReg = false;
  let myTodayRecord: any = null;
  let myRecentHistory: any[] = [];

  if (isInternHrd) {
    const { data: me } = await supabase
      .from('users')
      .select('face_descriptor')
      .eq('id', session.id)
      .single();

    needsFaceReg = !me?.face_descriptor || (Array.isArray(me.face_descriptor) && me.face_descriptor.length === 0);

    const { data: history } = await supabase
      .from('attendance')
      .select('id, date, check_in_time, check_out_time, status')
      .eq('user_id', session.id)
      .order('date', { ascending: false })
      .limit(10);

    myRecentHistory = (history as any[]) || [];
    myTodayRecord = myRecentHistory.find((h: any) => h.date === today) || null;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard HRD</h1>
          <p className="text-slate-400">
            {isInternHrd
              ? 'Halo, kelola presensi harian Anda dan pantau rekap absensi anak magang PT BPR Sehat Sejahtera.'
              : 'Monitoring absensi magang, perbantuan, dan periode batch aktif PT BPR Sehat Sejahtera.'}
          </p>
        </div>
        {activeBatch && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium w-fit">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Aktif: <strong>{activeBatch.name}</strong></span>
          </div>
        )}
      </div>

      {/* Personal Attendance Section for intern_hrd */}
      {isInternHrd && (
        <div className="space-y-5">
          {needsFaceReg && (
            <div className="glass-card border-amber-500/50 bg-amber-950/20 p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 rounded-full text-amber-400 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400 mb-1">Pendaftaran Wajah Diperlukan</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Sebagai Anak Magang HRD, Anda belum mendaftarkan data biometrik wajah. Silakan daftarkan wajah terlebih dahulu untuk melakukan absensi masuk dan pulang.
                  </p>
                  <Link href="/hrd/my-face" className="btn-primary text-sm inline-flex items-center gap-2">
                    <ScanFace className="w-4 h-4" />
                    Daftar Wajah Sekarang
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Personal Status Today */}
            <div className="glass-card p-6 relative overflow-hidden border-emerald-500/30">
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Status Absensi Saya Hari Ini
                </h2>
                <span className="text-xs text-slate-400">{formatDateID(today)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400 mb-1">Absen Masuk</p>
                  <p className="text-xl font-bold text-white">
                    {myTodayRecord?.check_in_time ? formatTime(myTodayRecord.check_in_time) : '--:--'}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400 mb-1">Absen Keluar</p>
                  <p className="text-xl font-bold text-white">
                    {myTodayRecord?.check_out_time ? formatTime(myTodayRecord.check_out_time) : '--:--'}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={needsFaceReg ? '/hrd/my-face' : '/hrd/my-attendance'}
                  className="btn-primary flex-1 text-sm"
                >
                  <Clock className="w-4 h-4" />
                  {needsFaceReg
                    ? 'Daftar Wajah Terlebih Dahulu'
                    : !myTodayRecord
                    ? 'Absen Masuk Sekarang'
                    : !myTodayRecord.check_out_time
                    ? 'Absen Keluar Sekarang'
                    : 'Lihat Detail Absensi Saya'}
                </Link>
                <Link
                  href="/hrd/my-face"
                  className="btn-secondary text-sm inline-flex items-center gap-2"
                >
                  <ScanFace className="w-4 h-4 text-cyan-400" />
                  Data Wajah
                </Link>
              </div>
            </div>

            {/* Personal Recent History */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Riwayat Absensi Saya (Terbaru)
                </h2>
                {myRecentHistory.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    Belum ada riwayat absensi pribadi.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1">
                    {myRecentHistory.slice(0, 5).map((rec: any) => (
                      <div key={rec.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-medium text-slate-200">{formatDateID(rec.date)}</p>
                          <p className="text-slate-400 mt-0.5">
                            Masuk: {rec.check_in_time ? formatTime(rec.check_in_time) : '-'} • Keluar:{' '}
                            {rec.check_out_time ? formatTime(rec.check_out_time) : '-'}
                          </p>
                        </div>
                        <span className={cn('badge', statusColor(rec.status))}>{statusLabel(rec.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

          {isManager ? (
            <>
              <Link
                href="/hrd/internship-summary"
                className="glass-card p-6 group hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    Rekap Penilaian Magang
                  </h3>
                  <p className="text-sm text-slate-400">
                    Akumulasi Total Hari Hadir, Total Jam Hadir, dan Persentase Kehadiran terhadap Hari Kerja Efektif batch.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mt-5">
                  <span>Lihat Rekap Penilaian</span>
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
            </>
          ) : (
            <>
              <Link
                href="/hrd/my-attendance"
                className="glass-card p-6 group hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                    Absen Harian Saya
                  </h3>
                  <p className="text-sm text-slate-400">
                    Lakukan presensi masuk dan keluar harian menggunakan pemindaian wajah dan verifikasi lokasi GPS kantor.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mt-5">
                  <span>Buka Kamera Absen</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/hrd/my-face"
                className="glass-card p-6 group hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform">
                    <ScanFace className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    Data Wajah Biometrik
                  </h3>
                  <p className="text-sm text-slate-400">
                    Daftarkan atau perbarui sampel biometrik wajah Anda untuk keperluan verifikasi absensi harian.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mt-5">
                  <span>Kelola Data Wajah</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Guide Card (Manager Only) */}
      {isManager && (
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
      )}
    </div>
  );
}
