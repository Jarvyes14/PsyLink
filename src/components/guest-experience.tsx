'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bookmark, CalendarDays, Heart, MapPin, SlidersHorizontal } from 'lucide-react';
import { api, money } from '@/lib/client';
import type { Professional } from '@/lib/types';
import { approaches, modalityLabel, specialties } from '@/domain/catalog';
import { Avatar, Badge, Brand, Empty, HelpLink, Loader } from './ui';

const SAVED_KEY = 'psicomatch-guest-saved';
const loginFor = (id: string) => `/login?next=${encodeURIComponent(`/psychologist/${id}`)}`;
type Filters = { specialty: string; approach: string; modality: string; city: string; maxPrice: string };
const emptyFilters: Filters = { specialty: '', approach: '', modality: '', city: '', maxPrice: '' };

export function GuestExperience({ path }: { path: string }) {
  const [profiles, setProfiles] = useState<Professional[]>([]);
  const [profile, setProfile] = useState<Professional | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const profileId = path.startsWith('/psychologist/') ? path.split('/')[2] : null;

  useEffect(() => {
    try { setSavedIds(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') as string[]); } catch { setSavedIds([]); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (profileId) setProfile(await api<Professional>(`profiles/${encodeURIComponent(profileId)}`));
      else {
        const query = new URLSearchParams();
        if (path !== '/saved') Object.entries(filters).forEach(([key, value]) => { if (value.trim()) query.set(key, value.trim()); });
        setProfiles(await api<Professional[]>(`discover?${query}`));
      }
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }, [filters, path, profileId]);
  useEffect(() => { void load(); }, [load]);

  function toggleSaved(id: string) {
    setSavedIds(previous => {
      const next = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }

  const visible = path === '/saved' ? profiles.filter(item => savedIds.includes(item.id)) : profiles;
  return <div className="public-site">
    <header className="public-header"><Brand /><nav><Link href="/discover">Explorar profesionales</Link><Link href="/saved">Guardados{savedIds.length ? ` (${savedIds.length})` : ''}</Link><Link href="/login" className="button secondary small">Iniciar sesión <ArrowRight size={15} /></Link></nav></header>
    <main className="app-main" id="main-content">
      {profileId ? loading ? <Loader /> : error || !profile ? <Empty title="Perfil no disponible" text={error || 'No encontramos ese perfil.'}><Link className="button primary" href="/discover">Volver a explorar</Link></Empty> : <>
        <Link className="back-link" href="/discover"><ArrowLeft size={17} />Volver a explorar</Link>
        <div className="detail-layout"><article>
          <div className="detail-header"><Avatar name={profile.user.name} photoId={profile.photoId} large /><div><span className="eyebrow">PERFIL PROFESIONAL{profile.user.isDemo ? ' · DEMO' : ''}</span><h1>{profile.user.name}</h1><Badge status={profile.verificationStatus} /><p>{profile.pronouns} · {profile.yearsExperience} años de experiencia</p><p><MapPin size={15} /> {profile.city}</p></div></div>
          <section className="detail-section"><h2>Un poco sobre mí</h2><p>{profile.bio}</p><p>{profile.philosophy}</p></section>
          <section className="detail-section"><h2>Áreas que acompaño</h2><div className="chips">{profile.specialties.map(item => <span className="chip static" key={item.specialtyId}>{item.specialty.name}</span>)}</div><h3>Mi enfoque</h3>{profile.approaches.map(item => <div className="approach-description" key={item.approachId}><h4>{item.approach.name}</h4><p>{item.approach.description}</p></div>)}<p>{profile.population} · {profile.ageRange}</p></section>
          <section className="detail-section"><h2>Mi forma de trabajar</h2><p>{profile.tools}</p><h3>Objetivos compartidos</h3><p>{profile.goalSetting}</p><h3>Entre sesiones</h3><p>{profile.homework}</p><h3>Duración del proceso</h3><p>{profile.processLength}</p></section>
          <section className="detail-section"><h2>Tu primera sesión</h2><p>{profile.firstSession}</p><h3>Qué puedes esperar</h3><p>{profile.expectations}</p></section>
          <section className="detail-section"><h2>Formación y experiencia</h2><p>{profile.university}</p><p>{profile.education}</p><p>{profile.certifications}</p><p>{profile.experience}</p><p>Cédula / licencia: {profile.license || 'No declarada'}</p></section>
          <section className="detail-section"><h2>Un espacio accesible</h2><p>{profile.accessibility}</p><p>Idiomas: {profile.languages.join(', ')}</p><p>{profile.contactMethods}</p></section>
        </article><aside className="detail-booking"><div className="panel"><span className="eyebrow">UN PRIMER ENCUENTRO</span><h2>{money(profile.price)}<small> MXN / sesión</small></h2><p>{profile.duration} minutos · {modalityLabel[profile.modality]}</p><p>{profile.availability.length} horarios disponibles</p><Link className="button primary full" href={loginFor(profile.id)}><Heart size={18} />Me interesa</Link><Link className="button secondary full" href={loginFor(profile.id)}><CalendarDays size={18} />Quiero agendar</Link><button className="button secondary full" onClick={() => toggleSaved(profile.id)}><Bookmark size={18} />{savedIds.includes(profile.id) ? 'Quitar de guardados' : 'Guardar sin cuenta'}</button><p className="fine-print">Puedes explorar sin cuenta. Para expresar interés o agendar, inicia sesión o regístrate. Una cita se puede solicitar cuando el profesional acepte tu interés.</p></div></aside></div>
      </> : <>
        <div className="page-heading"><div><p className="eyebrow">EXPLORA A TU RITMO</p><h1>{path === '/saved' ? 'Tus perfiles guardados.' : 'Conoce a tu próximo psicólogo.'}</h1><p className="subtle">Puedes ver perfiles y opciones sin crear una cuenta. Sólo te pediremos iniciar sesión para expresar interés o agendar.</p></div></div>
        {path !== '/saved' && <div className="panel"><span className="eyebrow"><SlidersHorizontal size={16} /> FILTRA TUS OPCIONES</span><div className="form-grid"><label>Especialidad<select value={filters.specialty} onChange={event => setFilters(previous => ({ ...previous, specialty: event.target.value }))}><option value="">Todas</option>{specialties.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Enfoque<select value={filters.approach} onChange={event => setFilters(previous => ({ ...previous, approach: event.target.value }))}><option value="">Todos</option>{approaches.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Modalidad<select value={filters.modality} onChange={event => setFilters(previous => ({ ...previous, modality: event.target.value }))}><option value="">Cualquiera</option><option value="ONLINE">En línea</option><option value="IN_PERSON">Presencial</option></select></label><label>Ciudad<input value={filters.city} onChange={event => setFilters(previous => ({ ...previous, city: event.target.value }))} placeholder="Cualquier ciudad" /></label><label>Precio máximo<input type="number" min={100} max={10000} value={filters.maxPrice} onChange={event => setFilters(previous => ({ ...previous, maxPrice: event.target.value }))} placeholder="Sin límite" /></label></div></div>}
        {loading ? <Loader /> : error ? <Empty title="No pudimos cargar los perfiles" text={error}><button className="button primary" onClick={() => void load()}>Reintentar</button></Empty> : !visible.length ? <Empty title={path === '/saved' ? 'Aún no tienes perfiles guardados' : 'No hay perfiles para estos filtros'} text={path === '/saved' ? 'Puedes guardar perfiles en este navegador sin crear una cuenta.' : 'Prueba con otros filtros o vuelve más tarde.'}><Link className="button primary" href="/discover">Explorar profesionales</Link></Empty> : <div className="saved-grid">{visible.map(item => <article className="saved-card" key={item.id}><Avatar name={item.user.name} photoId={item.photoId} /><div><Badge status={item.verificationStatus} /><h2>{item.user.name}</h2>{item.user.isDemo && <small>Perfil de demostración</small>}<p>{item.specialties.map(s => s.specialty.name).join(' · ')}</p><span>{modalityLabel[item.modality]} · {money(item.price)} / sesión</span><p>{item.bio}</p></div><div className="button-row"><Link className="button primary small" href={`/psychologist/${item.id}`}>Ver perfil <ArrowRight size={15} /></Link><button className="icon-button" aria-label={savedIds.includes(item.id) ? 'Quitar de guardados' : 'Guardar perfil'} onClick={() => toggleSaved(item.id)}><Bookmark size={20} fill={savedIds.includes(item.id) ? 'currentColor' : 'none'} /></button></div></article>)}</div>}
      </>}
    </main><footer className="public-footer"><Brand /><p>Un paso a la vez. A tu manera.</p><HelpLink /><Link href="/privacy">Privacidad</Link></footer>
  </div>;
}
