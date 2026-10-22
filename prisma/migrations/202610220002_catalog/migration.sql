INSERT INTO "Specialty" (id, name, "createdAt", "updatedAt") VALUES
  ('anxiety', 'Ansiedad y estrés', now(), now()),
  ('esteem', 'Autoestima', now(), now()),
  ('relationships', 'Relaciones', now(), now()),
  ('grief', 'Duelo', now(), now()),
  ('growth', 'Desarrollo personal', now(), now()),
  ('work', 'Problemas laborales', now(), now()),
  ('study', 'Problemas académicos', now(), now()),
  ('emotions', 'Manejo emocional', now(), now()),
  ('habits', 'Hábitos', now(), now()),
  ('other', 'Otros', now(), now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = now();

INSERT INTO "TherapeuticApproach" (id, name, description, "createdAt", "updatedAt") VALUES
  ('cbt', 'Cognitivo-conductual', 'Relaciona pensamientos, emociones y conductas; puede incluir ejercicios y objetivos acordados.', now(), now()),
  ('behavioral', 'Conductual', 'Estudia conductas y su contexto para trabajar cambios observables.', now(), now()),
  ('humanistic', 'Humanista', 'Pone el foco en la experiencia personal, los recursos y el crecimiento de la persona.', now(), now()),
  ('gestalt', 'Gestalt', 'Explora la experiencia en el presente y la conciencia de emociones y relaciones.', now(), now()),
  ('psychodynamic', 'Psicodinámica / psicoanalítica', 'Explora patrones, experiencias pasadas y procesos que pueden no ser conscientes.', now(), now()),
  ('systemic', 'Sistémica', 'Considera a la persona en sus relaciones y contextos familiares o sociales.', now(), now()),
  ('person', 'Centrada en la persona', 'Prioriza la relación terapéutica, la empatía y la capacidad de decisión de la persona.', now(), now()),
  ('act', 'Aceptación y compromiso', 'Trabaja la flexibilidad psicológica y acciones relacionadas con los valores personales.', now(), now()),
  ('dbt', 'Dialéctico-conductual', 'Integra aceptación, cambio y entrenamiento en habilidades.', now(), now()),
  ('brief', 'Terapia breve', 'Agrupa intervenciones delimitadas alrededor de necesidades y objetivos específicos.', now(), now()),
  ('integrative', 'Integrativa', 'Articula recursos de distintos modelos con una justificación profesional.', now(), now()),
  ('other', 'Otros', 'El profesional puede explicar su formación y marco de trabajo en su perfil.', now(), now())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, "updatedAt" = now();
