import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { currentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?auth_error=1', url.origin));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?auth_error=1', url.origin));
  const next = url.searchParams.get('next');
  if (next === '/reset-password') return NextResponse.redirect(new URL(next, url.origin));
  const user = await currentUser();
  const destination = !user ? '/login' : !user.onboardingComplete ? user.role === 'PSYCHOLOGIST' ? '/professional/onboarding' : '/onboarding' : user.role === 'ADMIN' ? '/admin' : user.role === 'PSYCHOLOGIST' ? '/dashboard' : '/discover';
  return NextResponse.redirect(new URL(destination, url.origin));
}
