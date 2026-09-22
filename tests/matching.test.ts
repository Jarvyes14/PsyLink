import { describe, expect, it } from 'vitest';
import { compatibility, matchesFilters, supportsModality } from '@/domain/matching';
import { defaultStyles } from '@/domain/catalog';
const profile = {
  specialties: [{ specialtyId: 'anxiety', specialty: { name: 'Ansiedad y estrés' } }],
  approaches: [{ approachId: 'cbt' }], styles: { ...defaultStyles, practice: 20 }, modality: 'BOTH',
  price: 700, languages: ['Español'], city: 'Ciudad de México', yearsExperience: 8, gender: 'Mujer',
  verificationStatus: 'VERIFIED', availability: [{ startsAt: new Date(Date.now() + 86400000).toISOString() }],
};
const preferences = { goals: ['anxiety'], styles: { ...defaultStyles, practice: 20 }, modality: 'ONLINE', budget: 900, availability: 'ANY', approaches: ['cbt'], language: 'Español', city: '', gender: 'ANY', minExperience: 0, strictBudget: false, strictModality: false };
describe('matching explicable', () => {
  it('normaliza la puntuación y devuelve razones concretas', () => { const result = compatibility(profile, preferences); expect(result.score).toBe(100); expect(result.reasons).toContain('Trabaja con ansiedad y estrés'); expect(result.reasons).toContain('Está dentro de tu presupuesto'); });
  it('redistribuye pesos de preferencias omitidas', () => { const result = compatibility(profile, { ...preferences, goals: [], approaches: [], language: '', modality: 'ANY' }); expect(result.score).toBe(100); });
  it('aplica filtros y requisitos obligatorios', () => { expect(matchesFilters(profile, { verified: true, maxPrice: 800, modality: 'ONLINE' }, preferences)).toBe(true); expect(matchesFilters(profile, { maxPrice: 500 }, preferences)).toBe(false); expect(matchesFilters(profile, {}, { ...preferences, budget: 500, strictBudget: true })).toBe(false); });
  it('trata BOTH como compatible con online y presencial', () => { expect(supportsModality('BOTH', 'ONLINE')).toBe(true); expect(supportsModality('ONLINE', 'IN_PERSON')).toBe(false); });
});
