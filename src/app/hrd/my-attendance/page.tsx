import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AttendancePanel } from '@/components/attendance-panel';

export default async function HrdMyAttendancePage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'intern_hrd' && session.role !== 'super_admin') {
    redirect('/hrd/dashboard');
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AttendancePanel
        dashboardHref="/hrd/dashboard"
        registerFaceHref="/hrd/my-face"
      />
    </div>
  );
}

