import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import {
  LayoutDashboard,
  Settings,
  FileSpreadsheet,
  Building2,
  CalendarCheck,
  Users,
  Layers,
} from 'lucide-react';
import { LogoutButton } from '../intern/logout-button';

export default async function HrdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || (session.role !== 'hrd' && session.role !== 'super_admin')) {
    redirect('/');
  }

  const isSuperAdmin = session.role === 'super_admin';

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      
      {/* Desktop Sidebar (HRD & Super Admin) */}
      <aside className="w-64 bg-slate-900 border-r border-white/5 flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <Building2 className="w-6 h-6 text-emerald-400 mr-2" />
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm tracking-wide">BPR Sehat Sejahtera</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isSuperAdmin ? 'text-purple-400' : 'text-emerald-400'}`}>
              {isSuperAdmin ? '⚡ Super Admin Portal' : 'HRD Portal'}
            </span>
          </div>
        </div>
        
        <div className="p-4 pb-2 flex-1 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            Absensi & Magang
          </p>
          <nav className="space-y-1">
            <Link href="/hrd/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span className="font-medium text-sm">Dashboard</span>
            </Link>
            <Link href="/hrd/attendance-recap" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <CalendarCheck className="w-4 h-4 text-amber-400" />
              <span className="font-medium text-sm">Rekap Absensi</span>
            </Link>
            <Link href="/hrd/interns" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="font-medium text-sm">Data Anak Magang</span>
            </Link>
            <Link href="/hrd/batches" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="font-medium text-sm">Manajemen Batch</span>
            </Link>
          </nav>

          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3 mt-6">
            Keuangan & Sistem
          </p>
          <nav className="space-y-1">
            <Link href="/hrd/payout" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">Rekap Uang Saku</span>
            </Link>
            <Link href="/hrd/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-sm">Pengaturan</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-slate-900/60">
          <div className="flex flex-col truncate pr-2">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-sm font-medium text-white truncate">{session.name}</span>
              {isSuperAdmin && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded text-[9px] font-bold">
                  SUPER
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 truncate">{session.email}</span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-slate-900 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center">
            <Building2 className="w-5 h-5 text-emerald-400 mr-2" />
            <span className="font-bold text-white text-sm">
              BPR Sehat Sejahtera ({isSuperAdmin ? 'Super Admin' : 'HRD'})
            </span>
          </div>
          <LogoutButton />
        </header>

        {/* Mobile Nav */}
        <nav className="md:hidden flex overflow-x-auto bg-slate-900 border-b border-white/5 shrink-0 px-2 hide-scrollbar">
          <Link href="/hrd/dashboard" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Dashboard</Link>
          <Link href="/hrd/attendance-recap" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Rekap Absensi</Link>
          <Link href="/hrd/interns" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Anak Magang</Link>
          <Link href="/hrd/batches" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Batch</Link>
          <Link href="/hrd/payout" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Uang Saku</Link>
          <Link href="/hrd/settings" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Pengaturan</Link>
        </nav>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
      
    </div>
  );
}
