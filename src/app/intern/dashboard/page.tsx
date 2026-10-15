import { getSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { formatDateID, formatTime, statusLabel, statusColor, cn } from '@/lib/utils';
import { Calendar, Clock, History, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InternDashboard() {
  const session = await getSession();
  if (!session) redirect('/');

  const supabase = createAdminClient();

  // Check if user has registered their face
  const { data: user } = await supabase
    .from('users')
    .select('face_descriptor')
    .eq('id', session.id)
    .single();

  const needsFaceReg = !user?.face_descriptor;

  // Fetch attendance history
  const { data: history } = await supabase
    .from('attendance')
    .select('id, date, check_in_time, check_out_time, status')
    .eq('user_id', session.id)
    .order('date', { ascending: false })
    .limit(30);

  // Check today's status
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = (history as any[])?.find((h: any) => h.date === todayStr);

  return (
    <div className="space-y-6 animate-fade-in sm:pl-56">
      
      {needsFaceReg && (
        <div className="glass-card border-amber-500/50 bg-amber-950/20 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-full text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-1">Pendaftaran Wajah Diperlukan</h3>
              <p className="text-sm text-slate-300 mb-4">
                Anda belum mendaftarkan data wajah. Anda tidak dapat melakukan absensi sebelum mendaftarkan wajah.
              </p>
              <Link href="/intern/register-face" className="btn-primary text-sm">
                Daftar Wajah Sekarang
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Today's Status Card */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
        
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          Status Hari Ini ({formatDateID(todayStr)})
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <p className="text-sm text-slate-400 mb-1">Absen Masuk</p>
            <p className="text-xl font-bold">
              {todayRecord?.check_in_time ? formatTime(todayRecord.check_in_time) : '--:--'}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <p className="text-sm text-slate-400 mb-1">Absen Keluar</p>
            <p className="text-xl font-bold">
              {todayRecord?.check_out_time ? formatTime(todayRecord.check_out_time) : '--:--'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link 
            href={needsFaceReg ? "/intern/register-face" : "/intern/attendance"} 
            className="btn-primary flex-1"
          >
            <Clock className="w-4 h-4" /> 
            {needsFaceReg ? 'Daftar Wajah Terlebih Dahulu' : !todayRecord ? 'Absen Masuk' : !todayRecord.check_out_time ? 'Absen Keluar' : 'Lihat Detail'}
          </Link>
        </div>
      </div>

      {/* History List */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          Riwayat Absensi (30 Hari Terakhir)
        </h2>
        
        <div className="glass-card overflow-hidden">
          {(!history || history.length === 0) ? (
            <div className="p-8 text-center text-slate-500">
              Belum ada data absensi.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {(history as any[]).map((record: any) => (
                <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-medium text-slate-200">{formatDateID(record.date)}</p>
                    <div className="flex gap-4 mt-1 text-sm text-slate-400">
                      <span>Masuk: {record.check_in_time ? formatTime(record.check_in_time) : '-'}</span>
                      <span>Keluar: {record.check_out_time ? formatTime(record.check_out_time) : '-'}</span>
                    </div>
                  </div>
                  <div className={cn("badge", statusColor(record.status))}>
                    {statusLabel(record.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
