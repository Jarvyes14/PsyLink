export const specialties = [
  ['anxiety', 'Ansiedad y estrés'], ['esteem', 'Autoestima'], ['relationships', 'Relaciones'],
  ['grief', 'Duelo'], ['growth', 'Desarrollo personal'], ['work', 'Problemas laborales'],
  ['study', 'Problemas académicos'], ['emotions', 'Manejo emocional'], ['habits', 'Hábitos'], ['other', 'Otros'],
] as const;
export const approaches = [
  ['cbt', 'Cognitivo-conductual', 'Relaciona pensamientos, emociones y conductas; puede incluir ejercicios y objetivos acordados.'],
  ['behavioral', 'Conductual', 'Estudia conductas y su contexto para trabajar cambios observables.'],
  ['humanistic', 'Humanista', 'Pone el foco en la experiencia personal, los recursos y el crecimiento de la persona.'],
  ['gestalt', 'Gestalt', 'Explora la experiencia en el presente y la conciencia de emociones y relaciones.'],
  ['psychodynamic', 'Psicodinámica / psicoanalítica', 'Explora patrones, experiencias pasadas y procesos que pueden no ser conscientes.'],
  ['systemic', 'Sistémica', 'Considera a la persona en sus relaciones y contextos familiares o sociales.'],
  ['person', 'Centrada en la persona', 'Prioriza la relación terapéutica, la empatía y la capacidad de decisión de la persona.'],
  ['act', 'Aceptación y compromiso', 'Trabaja la flexibilidad psicológica y acciones relacionadas con los valores personales.'],
  ['dbt', 'Dialéctico-conductual', 'Integra aceptación, cambio y entrenamiento en habilidades.'],
  ['brief', 'Terapia breve', 'Agrupa intervenciones delimitadas alrededor de necesidades y objetivos específicos.'],
  ['integrative', 'Integrativa', 'Articula recursos de distintos modelos con una justificación profesional.'],
  ['other', 'Otros', 'El profesional puede explicar su formación y marco de trabajo en su perfil.'],
] as const;
export const expectationOptions = ['Quiero que me escuchen', 'Quiero herramientas prácticas', 'Quiero entender el origen de lo que me ocurre', 'Quiero trabajar objetivos concretos', 'Prefiero sesiones estructuradas', 'Prefiero conversaciones abiertas', 'No estoy seguro'];
export const styleDimensions = [
  ['structure', 'Estructurado', 'Flexible'], ['direction', 'Directivo', 'Exploratorio'],
  ['practice', 'Práctico', 'Reflexivo'], ['formality', 'Formal', 'Conversacional'],
  ['time', 'Orientado al presente', 'Explora el pasado'], ['participation', 'Escucha principalmente', 'Participa activamente'],
  ['pace', 'Ritmo gradual', 'Orientado a objetivos'],
] as const;
export type Styles = Record<(typeof styleDimensions)[number][0], number>;
export const defaultStyles: Styles = { structure: 50, direction: 50, practice: 50, formality: 50, time: 50, participation: 50, pace: 50 };
export const modalityLabel: Record<string, string> = { ONLINE: 'Online', IN_PERSON: 'Presencial', BOTH: 'Online y presencial', ANY: 'Cualquiera' };
export const statusLabel: Record<string, string> = { UNVERIFIED: 'Sin verificar', PENDING: 'En revisión', VERIFIED: 'Verificado', REJECTED: 'Requiere cambios', REQUESTED: 'Solicitada', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Completada', ACCEPTED: 'Aceptada', DECLINED: 'Declinada', OPEN: 'Abierto', RESOLVED: 'Resuelto' };
