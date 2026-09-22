import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { homeFor } from '@/lib/client';
import { Application } from '@/components/application';
import { PublicPage } from '@/components/public-pages';
import type { User } from '@/lib/types';
export const dynamic = 'force-dynamic';
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/terms', '/help'];
const common = ['/messages', '/appointments', '/profile', '/settings'];
const patient = ['/discover', '/saved', '/matches', '/onboarding'];
const professional = ['/dashboard', '/requests', '/availability', '/verification', '/professional/edit', '/professional/onboarding'];
const admin = ['/admin', '/admin/verifications', '/admin/reports', '/admin/users'];
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params; const path = '/' + (slug?.join('/') || '');
  if (publicRoutes.includes(path)) return <PublicPage path={path} />;
  const isProfile = /^\/psychologist\/[^/]+$/.test(path);
  const isChat = /^\/messages\/[^/]+$/.test(path);
  if (![...common, ...patient, ...professional, ...admin].includes(path) && !isProfile && !isChat) notFound();
  const actor = await currentUser();
  if (!actor) redirect('/login');
  if ((patient.includes(path) && actor.role !== 'PATIENT') || (professional.includes(path) && actor.role !== 'PSYCHOLOGIST') || (admin.includes(path) && actor.role !== 'ADMIN')) redirect(homeFor(actor.role));
  if (!actor.onboardingComplete && actor.role !== 'ADMIN' && !['/onboarding', '/professional/onboarding', '/settings'].includes(path)) redirect(actor.role === 'PATIENT' ? '/onboarding' : '/professional/onboarding');
  return <Application path={path} user={JSON.parse(JSON.stringify(actor)) as User} />;
}
