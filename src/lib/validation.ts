import { z } from 'zod';
import { defaultStyles, specialties, approaches } from '@/domain/catalog';
const text = (max = 2000) => z.string().trim().max(max);
const ids = (allowed: readonly (readonly string[])[]) => z.array(z.string().refine(v => allowed.some(item => item[0] === v), 'Opción no válida')).max(12);
export const stylesSchema = z.object(Object.fromEntries(Object.keys(defaultStyles).map(k => [k, z.number().int().min(0).max(100)])) as Record<keyof typeof defaultStyles, z.ZodNumber>);
export const passwordSchema = z.string().min(12, 'Usa al menos 12 caracteres').max(128).regex(/[a-zA-Z]/, 'Incluye letras').regex(/[0-9]/, 'Incluye un número');
export const loginSchema = z.object({ email: z.email().max(254).transform(s => s.toLowerCase()), password: z.string().min(1).max(128) });
export const registerSchema = loginSchema.extend({ password: passwordSchema, name: text(100).min(2), role: z.enum(['PATIENT', 'PSYCHOLOGIST']), consent: z.literal(true), adult: z.literal(true) });
export const patientSchema = z.object({
  goals: ids(specialties).min(1), expectations: z.array(text(100)).max(7), modality: z.enum(['ANY', 'ONLINE', 'IN_PERSON']),
  city: text(100), budget: z.number().int().min(100).max(10000), availability: z.enum(['ANY', 'MORNING', 'AFTERNOON', 'EVENING']),
  language: z.enum(['Español', 'Inglés', 'Francés']), gender: z.enum(['ANY', 'Mujer', 'Hombre', 'No binario']),
  minExperience: z.number().int().min(0).max(60), approaches: ids(approaches), communication: text(100), frequency: text(100),
  strictBudget: z.boolean(), strictModality: z.boolean(), styles: stylesSchema,
});
export const professionalSchema = z.object({
  name: text(100).min(2), pronouns: text(60), gender: z.enum(['Mujer', 'Hombre', 'No binario', 'No especificado']), bio: text().min(30),
  city: text(100).min(2), modality: z.enum(['ONLINE', 'IN_PERSON', 'BOTH']), languages: z.array(z.enum(['Español', 'Inglés', 'Francés'])).min(1).max(3),
  yearsExperience: z.number().int().min(0).max(60), education: text(1000), university: text(200), license: text(100), certifications: text(1000),
  price: z.number().int().min(100).max(10000), duration: z.number().int().min(20).max(120), population: text(200), ageRange: text(100),
  experience: text(), contactMethods: text(500), accessibility: text(1000), tools: text(), firstSession: text(), expectations: text(), goalSetting: text(),
  homework: text(1000), processLength: text(500), philosophy: text(), styles: stylesSchema, acceptingPatients: z.boolean(),
  specialties: ids(specialties).min(1), approaches: ids(approaches).min(1), photoId: z.string().nullable().optional(),
});
export const filterSchema = z.object({ specialty: z.string().optional(), approach: z.string().optional(), modality: z.enum(['ONLINE', 'IN_PERSON', 'ANY']).optional(), maxPrice: z.coerce.number().min(0).max(10000).optional(), availability: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANY']).optional(), language: text(40).optional(), city: text(100).optional(), minExperience: z.coerce.number().min(0).max(60).optional(), verified: z.enum(['true', 'false']).transform(v => v === 'true').optional(), style: z.enum(['practical', 'reflective']).optional() });
