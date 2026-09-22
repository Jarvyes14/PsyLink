import { defaultStyles, type Styles } from './catalog';
export const MATCH_WEIGHTS = { needs: 30, style: 20, modality: 15, availability: 10, budget: 10, approach: 5, language: 5, other: 5 } as const;
export interface MatchableProfile {
  specialties: { specialtyId: string; specialty: { name: string } }[];
  approaches: { approachId: string }[];
  styles: unknown; modality: string; price: number; languages: string[]; city: string;
  yearsExperience: number; gender: string; verificationStatus: string;
  availability: { startsAt: Date | string }[];
}
export interface Preferences {
  goals: string[]; styles: unknown; modality: string; budget: number; availability: string;
  approaches: string[]; language: string; city: string; gender: string; minExperience: number;
  strictBudget: boolean; strictModality: boolean;
}
export function period(date: Date | string) {
  const hour = Number(new Intl.DateTimeFormat('en', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Mexico_City' }).format(new Date(date)));
  return hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING';
}
export const supportsModality = (p: string, choice: string) => choice === 'ANY' || p === 'BOTH' || p === choice;
export function compatibility(profile: MatchableProfile, pref: Preferences) {
  const reasons: string[] = [];
  const values: Record<keyof typeof MATCH_WEIGHTS, number | null> = { needs: null, style: null, modality: null, availability: null, budget: null, approach: null, language: null, other: null };
  if (pref.goals.length) {
    const matched = profile.specialties.filter(s => pref.goals.includes(s.specialtyId));
    values.needs = matched.length / pref.goals.length;
    if (matched.length) reasons.push(`Trabaja con ${matched.map(s => s.specialty.name.toLowerCase()).join(', ')}`);
  }
  const pStyle = { ...defaultStyles, ...(profile.styles as Partial<Styles>) };
  const wanted = { ...defaultStyles, ...(pref.styles as Partial<Styles>) };
  values.style = 1 - Object.keys(defaultStyles).reduce((sum, key) => sum + Math.abs(pStyle[key as keyof Styles] - wanted[key as keyof Styles]), 0) / 700;
  if (values.style >= .8) reasons.push('Su forma de trabajar se acerca a tu estilo preferido');
  if (pref.modality !== 'ANY') { values.modality = supportsModality(profile.modality, pref.modality) ? 1 : 0; if (values.modality) reasons.push(pref.modality === 'ONLINE' ? 'Ofrece terapia online' : 'Ofrece consulta presencial'); }
  if (pref.availability !== 'ANY') { values.availability = profile.availability.some(a => new Date(a.startsAt) > new Date() && period(a.startsAt) === pref.availability) ? 1 : 0; if (values.availability) reasons.push('Tiene horarios en tu franja preferida'); }
  values.budget = profile.price <= pref.budget ? 1 : Math.max(0, 1 - (profile.price - pref.budget) / Math.max(pref.budget, 1));
  if (profile.price <= pref.budget) reasons.push('Está dentro de tu presupuesto');
  if (pref.approaches.length) { values.approach = profile.approaches.some(a => pref.approaches.includes(a.approachId)) ? 1 : 0; if (values.approach) reasons.push('Ofrece un enfoque que te interesa'); }
  if (pref.language) { values.language = profile.languages.includes(pref.language) ? 1 : 0; if (values.language) reasons.push(`Atiende en ${pref.language.toLowerCase()}`); }
  const other = [pref.city ? profile.city.toLowerCase().includes(pref.city.toLowerCase()) : null, pref.gender !== 'ANY' ? profile.gender === pref.gender : null, pref.minExperience > 0 ? profile.yearsExperience >= pref.minExperience : null].filter(v => v !== null);
  if (other.length) values.other = other.filter(Boolean).length / other.length;
  let total = 0, weight = 0;
  for (const key of Object.keys(MATCH_WEIGHTS) as (keyof typeof MATCH_WEIGHTS)[]) { if (values[key] !== null) { total += MATCH_WEIGHTS[key] * values[key]!; weight += MATCH_WEIGHTS[key]; } }
  return { score: Math.round(Math.max(0, Math.min(100, weight ? total / weight * 100 : 0))), reasons, dimensions: values };
}
export interface Filters { specialty?: string; approach?: string; modality?: string; maxPrice?: number; availability?: string; language?: string; city?: string; minExperience?: number; verified?: boolean; style?: string }
export function matchesFilters(p: MatchableProfile, f: Filters, pref?: Preferences | null) {
  return (!f.specialty || p.specialties.some(s => s.specialtyId === f.specialty)) &&
    (!f.approach || p.approaches.some(a => a.approachId === f.approach)) &&
    (!f.modality || supportsModality(p.modality, f.modality)) &&
    (f.maxPrice === undefined || p.price <= f.maxPrice) &&
    (!f.availability || f.availability === 'ANY' || p.availability.some(a => new Date(a.startsAt) > new Date() && period(a.startsAt) === f.availability)) &&
    (!f.language || p.languages.includes(f.language)) &&
    (!f.city || p.city.toLowerCase().includes(f.city.toLowerCase())) &&
    (!f.minExperience || p.yearsExperience >= f.minExperience) &&
    (!f.verified || p.verificationStatus === 'VERIFIED') &&
    (!f.style || (f.style === 'practical' ? (p.styles as Styles).practice <= 40 : (p.styles as Styles).practice >= 60)) &&
    (!pref?.strictBudget || p.price <= pref.budget) &&
    (!pref?.strictModality || supportsModality(p.modality, pref.modality));
}
