import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const session = await getSession();

  if (session) {
    if (session.role === 'intern') {
      redirect('/intern/dashboard');
    } else {
      redirect('/hrd/dashboard');
    }
  }

  return <LoginForm />;
}
