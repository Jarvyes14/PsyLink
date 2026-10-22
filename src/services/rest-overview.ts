import type { Actor } from '@/lib/auth';
import { adminDb, dataOrThrow } from '@/lib/supabase-admin';
import { restProfessional } from './rest-profiles';

type Person = { id: string; name: string; active: boolean; isDemo: boolean };
type Party = { id: string; userId: string; user: Person };
type Conversation = { id: string; matchId: string };
type Match = { id: string; patientId: string; psychologistId: string; active: boolean; updatedAt: string; patient: Party; psychologist: Party; conversation: Conversation[] | Conversation | null };
type Interest = { id: string; patientId: string; psychologistId: string; status: string; createdAt: string; patient: Party; psychologist: Party };

export async function restOverview(actor: Actor) {
  const db = adminDb();
  const blocks = dataOrThrow<{ blockerId: string; blockedId: string }[]>(await db.from('Block').select('blockerId,blockedId').or(`blockerId.eq.${actor.id},blockedId.eq.${actor.id}`));
  const excluded = new Set(blocks.map(b => b.blockerId === actor.id ? b.blockedId : b.blockerId));
  const field = actor.patient ? 'patientId' : 'psychologistId';
  const profileId = actor.patient?.id || actor.psychologist?.id || '__none__';
  const [rawMatches, rawAppointments, rawInterests] = await Promise.all([
    db.from('Match').select('*,patient:PatientProfile(id,userId,user:User(id,name,active,isDemo)),psychologist:PsychologistProfile(id,userId,user:User(id,name,active,isDemo)),conversation:Conversation(id,matchId)').eq(field, profileId).eq('active', true).order('updatedAt', { ascending: false }),
    db.from('Appointment').select('*,patient:PatientProfile(user:User(name)),psychologist:PsychologistProfile(user:User(name))').eq(field, profileId).order('startsAt'),
    db.from('Interest').select('*,patient:PatientProfile(id,userId,user:User(id,name,active,isDemo)),psychologist:PsychologistProfile(id,userId,user:User(id,name,active,isDemo))').eq(field, profileId).order('createdAt', { ascending: false }),
  ]);
  const matches = (dataOrThrow(rawMatches) as unknown as Match[] || []).filter(m => m.patient.user.active && m.psychologist.user.active && m.patient.user.isDemo === actor.isDemo && m.psychologist.user.isDemo === actor.isDemo && !excluded.has(m.patient.userId) && !excluded.has(m.psychologist.userId));
  const interests = (dataOrThrow<Interest[]>(rawInterests) || []).filter(i => i.patient.user.active && i.psychologist.user.active && i.patient.user.isDemo === actor.isDemo && i.psychologist.user.isDemo === actor.isDemo && !excluded.has(i.patient.userId) && !excluded.has(i.psychologist.userId));
  const appointments = dataOrThrow(rawAppointments);
  const ids = [...new Set(matches.map(m => m.psychologistId))];
  const professionals = new Map(await Promise.all(ids.map(async id => [id, await restProfessional(actor, id)] as const)));
  const conversationFor = (m: Match) => Array.isArray(m.conversation) ? m.conversation[0] || null : m.conversation;
  const conversationIds = matches.map(m => conversationFor(m)?.id).filter((id): id is string => !!id);
  const allMessages = conversationIds.length ? dataOrThrow<{ id: string; conversationId: string; senderId: string; body: string; readAt: string | null; createdAt: string }[]>(await db.from('Message').select('id,conversationId,senderId,body,readAt,createdAt').in('conversationId', conversationIds).order('createdAt', { ascending: false }).limit(1000)) : [];
  const decoratedMatches = matches.map(m => {
    const conversation = conversationFor(m);
    const messages = allMessages.filter(message => message.conversationId === conversation?.id);
    return { ...m, psychologist: { ...professionals.get(m.psychologistId), ...m.psychologist }, conversation: conversation && { ...conversation, messages: messages.slice(0, 1), _count: { messages: messages.filter(message => !message.readAt && message.senderId !== actor.id).length } } };
  });
  const rawFavorites = actor.patient ? dataOrThrow<{ psychologistId: string }[]>(await db.from('Favorite').select('psychologistId').eq('patientId', actor.patient.id).order('createdAt', { ascending: false })) : [];
  const favorites = (await Promise.all(rawFavorites.map(async f => { try { return await restProfessional(actor, f.psychologistId); } catch { return null; } }))).filter((p): p is NonNullable<typeof p> => !!p);
  let profile = null;
  if (actor.psychologist) {
    const p = await restProfessional(actor, actor.psychologist.id);
    const [slots, verifications] = await Promise.all([
      db.from('Availability').select('*,appointments:Appointment(id,status)').eq('psychologistId', p.id).gt('startsAt', new Date().toISOString()).order('startsAt'),
      db.from('ProfessionalVerification').select('*').eq('psychologistId', p.id).order('createdAt', { ascending: false }),
    ]);
    profile = { ...p, availability: dataOrThrow(slots), verifications: dataOrThrow(verifications) };
  }
  return { user: actor, matches: decoratedMatches, appointments, interests, favorites, profile };
}

export async function restAdminOverview() {
  const db = adminDb();
  const [usersResult, verificationsResult, reportsResult, matchesResult, appointmentsResult] = await Promise.all([
    db.from('User').select('id,name,email,role,active,createdAt,psychologist:PsychologistProfile(id,verificationStatus)').order('createdAt', { ascending: false }),
    db.from('ProfessionalVerification').select('*,psychologist:PsychologistProfile(user:User(name))').order('createdAt', { ascending: false }),
    db.from('Report').select('*,reporter:User!Report_reporterId_fkey(name),target:User!Report_targetId_fkey(name)').order('createdAt', { ascending: false }),
    db.from('Match').select('*', { count: 'exact', head: true }).eq('active', true),
    db.from('Appointment').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED'),
  ]);
  const usersRaw = dataOrThrow(usersResult) as unknown as { role: string; psychologist: { id: string; verificationStatus: string }[] | { id: string; verificationStatus: string } | null }[];
  const users = usersRaw.map(user => ({ ...user, psychologist: Array.isArray(user.psychologist) ? user.psychologist[0] || null : user.psychologist }));
  const verifications = dataOrThrow(verificationsResult);
  const reports = dataOrThrow(reportsResult);
  if (matchesResult.error || appointmentsResult.error) throw new Error('Admin stats unavailable');
  return { users, verifications, reports, stats: { users: users.length, professionals: users.filter(u => u.role === 'PSYCHOLOGIST').length, matches: matchesResult.count || 0, appointments: appointmentsResult.count || 0 } };
}
