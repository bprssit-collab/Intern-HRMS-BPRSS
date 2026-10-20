import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { HRD_PORTAL_ROLES, MANAGER_ROLES } from '@/lib/permissions';
import { UserRole } from '@/types';
import Link from 'next/link';
import {
  LayoutDashboard,
  Settings,
  FileSpreadsheet,
  Building2,
  CalendarCheck,
  Users,
  Layers,
  History,
  UserCog,
  ShieldCheck,
} from 'lucide-react';
import { LogoutButton } from '../intern/logout-button';

const ROLE_LABELS: Record<UserRole, { title: string; color: string; badge: string }> = {
  super_admin: { title: 'Super Admin Portal', color: 'text-purple-400', badge: 'SUPER ADMIN' },
  kepala_hrd: { title: 'Kepala HRD Portal', color: 'text-emerald-400', badge: 'KEPALA HRD' },
  staf_hrd: { title: 'Staf HRD Portal', color: 'text-teal-400', badge: 'STAF HRD' },
  intern_hrd: { title: 'Intern HRD Portal', color: 'text-amber-400', badge: 'INTERN HRD' },
  intern: { title: 'Portal Intern', color: 'text-blue-400', badge: 'INTERN' },
};

export default async function HrdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || !HRD_PORTAL_ROLES.includes(session.role as any)) {
    redirect(session?.role === 'intern' ? '/intern/dashboard' : '/');
  }

  const role = session.role as UserRole;
  const isSuperAdmin = role === 'super_admin';
  const isManager = MANAGER_ROLES.includes(role as any);
  const roleMeta = ROLE_LABELS[role] || { title: 'HRD Portal', color: 'text-emerald-400', badge: role };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-white/5 flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <Building2 className="w-6 h-6 text-emerald-400 mr-2 shrink-0" />
          <div className="flex flex-col truncate">
            <span className="font-bold text-white text-sm tracking-wide truncate">BPR Sehat Sejahtera</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${roleMeta.color}`}>
              {roleMeta.title}
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
            {isManager && (
              <Link href="/hrd/attendance-history" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                <History className="w-4 h-4 text-orange-400" />
                <span className="font-medium text-sm">Riwayat Absensi</span>
              </Link>
            )}
            <Link href="/hrd/interns" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="font-medium text-sm">Data Anak Magang</span>
            </Link>
            {isManager && (
              <Link href="/hrd/batches" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="font-medium text-sm">Manajemen Batch</span>
              </Link>
            )}
          </nav>

          {isManager && (
            <>
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
                  <span className="font-medium text-sm">Pengaturan Lokasi</span>
                </Link>
              </nav>
            </>
          )}

          {isSuperAdmin && (
            <>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3 mt-6">
                Administrator
              </p>
              <nav className="space-y-1">
                <Link href="/hrd/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 border border-purple-500/20 transition-colors">
                  <UserCog className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-sm">Manajemen Akun</span>
                </Link>
                <Link href="/hrd/departments" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 border border-purple-500/20 transition-colors">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-sm">Manajemen Divisi</span>
                </Link>
                <Link href="/hrd/roles" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 border border-purple-500/20 transition-colors">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-sm">Manajemen Role</span>
                </Link>
              </nav>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-slate-900/60">
          <div className="flex flex-col truncate pr-2">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-sm font-medium text-white truncate">{session.name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider ${
                isSuperAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                role === 'kepala_hrd' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                role === 'staf_hrd' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {roleMeta.badge}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 truncate mt-0.5">{session.email}</span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-slate-900 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center min-w-0 pr-2">
            <Building2 className="w-5 h-5 text-emerald-400 mr-2 shrink-0" />
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-xs truncate">BPR Sehat Sejahtera</span>
              <span className={`text-[10px] font-semibold uppercase ${roleMeta.color} truncate`}>
                {roleMeta.badge}
              </span>
            </div>
          </div>
          <LogoutButton />
        </header>

        {/* Mobile Nav */}
        <nav className="md:hidden flex overflow-x-auto bg-slate-900 border-b border-white/5 shrink-0 px-2 hide-scrollbar">
          <Link href="/hrd/dashboard" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Dashboard</Link>
          <Link href="/hrd/attendance-recap" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Rekap Absensi</Link>
          {isManager && (
            <Link href="/hrd/attendance-history" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-orange-400">Riwayat Absen</Link>
          )}
          <Link href="/hrd/interns" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Anak Magang</Link>
          {isManager && (
            <>
              <Link href="/hrd/batches" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Batch</Link>
              <Link href="/hrd/payout" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Uang Saku</Link>
              <Link href="/hrd/settings" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-slate-300">Pengaturan</Link>
            </>
          )}
          {isSuperAdmin && (
            <>
              <Link href="/hrd/users" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-purple-400">Kelola Akun</Link>
              <Link href="/hrd/departments" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-purple-400">Kelola Divisi</Link>
              <Link href="/hrd/roles" className="flex-shrink-0 px-3 py-3 text-xs font-medium text-purple-400">Kelola Role</Link>
            </>
          )}
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
