import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let user = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  } catch (error) {
    console.warn('Supabase not configured or failed to check session:', error);
  }

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
