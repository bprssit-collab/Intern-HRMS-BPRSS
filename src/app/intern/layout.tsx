import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { LayoutDashboard, Camera, LogOut, ScanFace } from 'lucide-react';
import { LogoutButton } from './logout-button'; // Will create this client component

export default async function InternLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== 'intern') {
    redirect('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 pb-20 sm:pb-0">
      {/* Mobile-first top header */}
      <header className="bg-slate-900 border-b border-white/10 p-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-bold text-emerald-400">Intern Portal</h1>
            <p className="text-xs text-slate-400">Hai, {session.name}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 z-40 pb-safe">
        <div className="flex justify-around items-center h-16">
          <Link href="/intern/dashboard" className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors p-2">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </Link>
          <Link href="/intern/attendance" className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors p-2">
            <div className="bg-emerald-500/20 p-2 rounded-full -mt-4 text-emerald-400 border border-emerald-500/30">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium">Absen</span>
          </Link>
          <Link href="/intern/register-face" className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors p-2">
            <ScanFace className="w-5 h-5" />
            <span className="text-[10px] font-medium">Data Wajah</span>
          </Link>
        </div>
      </nav>

      {/* Desktop sidebar navigation (hidden on mobile) */}
      <div className="hidden sm:block fixed left-4 top-24 w-48 space-y-2">
         <Link href="/intern/dashboard" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-slate-300 hover:text-white">
            <LayoutDashboard className="w-5 h-5 text-emerald-400" />
            <span>Dashboard</span>
          </Link>
          <Link href="/intern/attendance" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-slate-300 hover:text-white">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Absen Harian</span>
          </Link>
          <Link href="/intern/register-face" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-slate-300 hover:text-white">
            <ScanFace className="w-5 h-5 text-emerald-400" />
            <span>Daftar Wajah</span>
          </Link>
      </div>
    </div>
  );
}
