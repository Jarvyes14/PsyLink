'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Bookmark, HeartHandshake, MessageCircle, UserRound, LayoutDashboard, CalendarDays, ClipboardList, ShieldCheck, Users, Flag, Settings, LogOut, ArrowUpRight, Bell, X } from 'lucide-react';
import type { Overview, User } from '@/lib/types';
import { api, homeFor } from '@/lib/client';
import { Brand, Avatar, HelpLink, Loader } from './ui';
import { AppContext } from './app-context';
import { Discover, Saved, ProfessionalDetail } from './discovery';
import { PatientOnboarding, ProfessionalEditor } from './onboarding';
import { Connections, Messaging, Appointments, Dashboard, Requests, AvailabilityEditor, Verification, Account } from './workspace';
import { Admin } from './admin';
const patientNav = [['/discover', 'Descubrir', Compass], ['/saved', 'Guardados', Bookmark], ['/matches', 'Matches', HeartHandshake], ['/messages', 'Mensajes', MessageCircle], ['/profile', 'Perfil', UserRound]] as const;
const proNav = [['/dashboard', 'Inicio', LayoutDashboard], ['/requests', 'Solicitudes', ClipboardList], ['/appointments', 'Agenda', CalendarDays], ['/messages', 'Mensajes', MessageCircle], ['/profile', 'Perfil', UserRound]] as const;
const adminNav = [['/admin', 'Resumen', LayoutDashboard], ['/admin/verifications', 'Verificaciones', ShieldCheck], ['/admin/users', 'Usuarios', Users], ['/admin/reports', 'Reportes', Flag], ['/settings', 'Ajustes', Settings]] as const;
export function Application({ path, user }: { path: string; user: User }) {
  const router = useRouter(); const [data, setData] = useState<Overview | null>(null); const [error, setError] = useState(''); const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const refresh = useCallback(async () => { try { const d = await api<Overview>('overview'); setData(d); setError(''); } catch (e) { setError((e as Error).message); } }, []);
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);
  useEffect(() => { void refresh(); }, [refresh, path]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 5000); return () => clearTimeout(id); }, [toast]);
  const nav = user.role === 'PATIENT' ? patientNav : user.role === 'PSYCHOLOGIST' ? proNav : adminNav;
  const active = (href: string) => path === href || (href === '/messages' && path.startsWith('/messages/'));
  const unread = data?.matches.reduce((total, m) => total + (m.conversation?._count.messages || 0), 0) || 0;
  async function signOut() { try { await api('auth/logout', 'POST'); router.push('/login'); router.refresh(); } catch (e) { notify((e as Error).message, true); } }
  function content() {
    if (path === '/onboarding') return <PatientOnboarding />;
    if (path === '/professional/onboarding' || path === '/professional/edit') return <ProfessionalEditor />;
    if (path === '/discover') return <Discover />;
    if (path === '/saved') return <Saved />;
    if (path.startsWith('/psychologist/')) return <ProfessionalDetail id={path.split('/')[2]} />;
    if (path === '/matches') return <Connections />;
    if (path.startsWith('/messages')) return <Messaging id={path.split('/')[2]} />;
    if (path === '/appointments') return <Appointments />;
    if (path === '/dashboard') return <Dashboard />;
    if (path === '/requests') return <Requests />;
    if (path === '/availability') return <AvailabilityEditor />;
    if (path === '/verification') return <Verification />;
    if (path.startsWith('/admin')) return <Admin path={path} />;
    return <Account settings={path === '/settings'} />;
  }
  return <div className="app-layout"><a href="#main-content" className="skip-link">Saltar al contenido</a><aside className="sidebar"><Brand /><span className="sidebar-label">{user.role === 'PATIENT' ? 'TU ESPACIO' : user.role === 'PSYCHOLOGIST' ? 'ESPACIO PROFESIONAL' : 'ADMINISTRACIÓN'}</span><nav>{nav.map(([href, label, Icon]) => <Link key={href} href={href} className={active(href) ? 'active' : ''} aria-current={active(href) ? 'page' : undefined}><Icon size={21} />{label}{href === '/messages' && unread > 0 && <span className="nav-count">{unread}</span>}</Link>)}</nav>{user.role === 'PATIENT' && <Link href="/appointments" className="sidebar-extra"><CalendarDays size={20} /> Mis sesiones</Link>}<div className="sidebar-bottom"><div className="sidebar-note"><span>Este es tu espacio.</span><p>Avanza a tu ritmo.<br />Cada paso cuenta.</p><span className="note-flower">✳</span></div><HelpLink /><Link href="/settings" className="sidebar-extra"><Settings size={18} /> Configuración</Link><button className="sidebar-extra" onClick={signOut}><LogOut size={18} /> Cerrar sesión</button><div className="sidebar-user"><Avatar name={user.name} /><div><strong>{user.name}</strong><small>{user.role === 'PATIENT' ? 'Mi espacio personal' : user.role === 'PSYCHOLOGIST' ? 'Profesional' : 'Administrador'}</small></div></div></div></aside><div className="app-body"><header className="app-topbar"><div className="mobile-brand"><Brand /></div><p className="desktop-only">Un paso a la vez. <span>A tu manera.</span></p><div className="topbar-actions"><span className="demo-pill">DEMO · Datos ficticios</span><Link href={user.role === 'PSYCHOLOGIST' ? '/requests' : user.role === 'ADMIN' ? '/admin/verifications' : '/messages'} className="icon-button" aria-label="Ver novedades"><Bell size={20} />{unread > 0 && <span className="notification-dot" />}</Link><Link href="/profile" className="topbar-avatar" aria-label="Mi perfil"><Avatar name={user.name} /></Link></div></header><main id="main-content" className={`app-main ${path.includes('onboarding') ? 'onboarding-main' : ''}`}>{!data ? error ? <div className="empty"><h1>No pudimos cargar tu espacio.</h1><p role="alert">{error}</p><button className="button primary" onClick={refresh}>Reintentar</button><Link href={homeFor(user.role)}>Ir al inicio</Link></div> : <Loader /> : <AppContext.Provider value={{ user: data.user, data, refresh, notify }}>{content()}</AppContext.Provider>}</main><div className="mobile-help"><HelpLink /></div></div><nav className="bottom-nav" aria-label="Navegación principal">{nav.map(([href, label, Icon]) => <Link key={href} href={href} className={active(href) ? 'active' : ''} aria-current={active(href) ? 'page' : undefined}><span><Icon size={22} />{href === '/messages' && unread > 0 && <i>{unread}</i>}</span>{label}</Link>)}</nav>{toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.message}<button aria-label="Cerrar notificación" onClick={() => setToast(null)}><X size={18} /></button></div>}<Link className="mobile-home" href="/help" aria-label="Ayuda inmediata"><ArrowUpRight size={14} /></Link></div>;
}
