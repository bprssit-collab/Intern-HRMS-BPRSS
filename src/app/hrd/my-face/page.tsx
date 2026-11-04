import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { FaceRegisterPanel } from '@/components/face-register-panel';

export default async function HrdMyFacePage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'intern_hrd' && session.role !== 'super_admin') {
    redirect('/hrd/dashboard');
  }

  return (
    <div className="max-w-3xl mx-auto">
      <FaceRegisterPanel dashboardHref="/hrd/dashboard" />
    </div>
  );
}

