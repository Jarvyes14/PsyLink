-- Public, fictional profiles for the guest discovery preview.
-- Safe to re-run. These users have no Supabase Auth identity or usable password.
-- Keep verificationStatus UNVERIFIED and do not add these profiles to real-user flows.

BEGIN;

INSERT INTO "User" ("id", "authId", "email", "passwordHash", "name", "role", "isDemo", "active", "consentAt", "onboardingComplete", "updatedAt")
VALUES
  ('demo-user-01', NULL, 'demo.ana@psicomatch.invalid', 'DEMO_ACCOUNT_DISABLED', 'Ana Robles', 'PSYCHOLOGIST', true, true, NOW(), true, NOW()),
  ('demo-user-02', NULL, 'demo.marco@psicomatch.invalid', 'DEMO_ACCOUNT_DISABLED', 'Marco Vidal', 'PSYCHOLOGIST', true, true, NOW(), true, NOW()),
  ('demo-user-03', NULL, 'demo.lucia@psicomatch.invalid', 'DEMO_ACCOUNT_DISABLED', 'Lucía Campos', 'PSYCHOLOGIST', true, true, NOW(), true, NOW()),
  ('demo-user-04', NULL, 'demo.diego@psicomatch.invalid', 'DEMO_ACCOUNT_DISABLED', 'Diego Salas', 'PSYCHOLOGIST', true, true, NOW(), true, NOW()),
  ('demo-user-05', NULL, 'demo.elena@psicomatch.invalid', 'DEMO_ACCOUNT_DISABLED', 'Elena Cruz', 'PSYCHOLOGIST', true, true, NOW(), true, NOW()),
  ('demo-user-06', NULL, 'demo.sofia@psicomatch.invalid', 'DEMO_ACCOUNT_DISABLED', 'Sofía Reyes', 'PSYCHOLOGIST', true, true, NOW(), true, NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name", "role" = EXCLUDED."role", "isDemo" = true,
  "active" = true, "onboardingComplete" = true, "updatedAt" = NOW();

INSERT INTO "PsychologistProfile" (
  "id", "userId", "pronouns", "gender", "bio", "city", "modality", "languages",
  "yearsExperience", "education", "university", "license", "certifications", "price",
  "duration", "population", "ageRange", "experience", "contactMethods", "accessibility",
  "tools", "firstSession", "expectations", "goalSetting", "homework", "processLength",
  "philosophy", "styles", "acceptingPatients", "verificationStatus", "updatedAt"
)
VALUES
  ('demo-profile-01', 'demo-user-01', 'ella', 'Mujer', 'Acompaño a personas adultas que quieren comprender mejor su ansiedad y encontrar herramientas que se adapten a su vida cotidiana. Este perfil es una muestra ficticia.', 'Mérida', 'ONLINE', ARRAY['Español'], 8, 'Maestría en Psicoterapia (dato ficticio)', 'Institución de ejemplo', '', '', 750, 50, 'Adultos', '18+', 'Atención individual en línea (experiencia ficticia)', 'Mensajes en PsyMatch', 'Sesiones en línea; ajustes de accesibilidad por conversar.', 'Registro de emociones y ejercicios de respiración.', 'Primero conversamos sobre lo que te trae y acordamos qué sería útil para ti.', 'Un espacio colaborativo, confidencial y sin juicios.', 'Definimos objetivos de manera conjunta y los revisamos periódicamente.', 'Las prácticas entre sesiones son opcionales y acordes a tus necesidades.', 'Se acuerda individualmente y puede variar.', 'Me interesa crear un espacio seguro donde podamos avanzar a tu ritmo.', '{"structure":65,"direction":45,"practice":75,"formality":40,"time":65,"participation":65,"pace":55}', true, 'UNVERIFIED', NOW()),
  ('demo-profile-02', 'demo-user-02', 'él', 'Hombre', 'En este perfil de demostración muestro un enfoque práctico para explorar estrés laboral, límites y equilibrio entre responsabilidades y descanso.', 'Mérida', 'BOTH', ARRAY['Español'], 11, 'Licenciatura en Psicología (dato ficticio)', 'Institución de ejemplo', '', '', 900, 50, 'Adultos', '18+', 'Acompañamiento individual ficticio en temas laborales', 'Mensajes en PsyMatch', 'Modalidad presencial u online a modo ilustrativo.', 'Herramientas de reflexión y organización de hábitos.', 'En la primera sesión exploramos tus prioridades y expectativas.', 'Podemos construir una conversación directa y respetuosa.', 'Los objetivos se ajustan a lo que sea significativo para cada persona.', 'No hay tareas obligatorias; podemos probar herramientas si te sirven.', 'Se acuerda individualmente y puede variar.', 'El bienestar también incluye reconocer límites y necesidades.', '{"structure":70,"direction":60,"practice":80,"formality":55,"time":50,"participation":70,"pace":70}', true, 'UNVERIFIED', NOW()),
  ('demo-profile-03', 'demo-user-03', 'ella', 'Mujer', 'Perfil ficticio de ejemplo sobre autoestima y relaciones. Sirve para que puedas recorrer las secciones de presentación, áreas de trabajo y estilo terapéutico.', 'Mérida', 'ONLINE', ARRAY['Español','Inglés'], 6, 'Formación profesional (dato ficticio)', 'Institución de ejemplo', '', '', 680, 50, 'Adultos', '18+', 'Ejemplo de acompañamiento individual, sin servicios reales', 'Mensajes en PsyMatch', 'Información de accesibilidad de ejemplo.', 'Conversación guiada y ejercicios de autoconocimiento.', 'Un primer encuentro para conocernos y aclarar dudas.', 'Un proceso amable, colaborativo y centrado en la persona.', 'Exploramos metas pequeñas y revisamos cómo te hacen sentir.', 'Las actividades son opcionales y se acuerdan contigo.', 'Se acuerda individualmente y puede variar.', 'La curiosidad y la compasión pueden acompañar el cambio.', '{"structure":45,"direction":40,"practice":55,"formality":35,"time":60,"participation":65,"pace":45}', true, 'UNVERIFIED', NOW()),
  ('demo-profile-04', 'demo-user-04', 'él', 'Hombre', 'Muestra de perfil ficticio enfocado en procesos de duelo y cambios importantes. La información no describe a un profesional real.', 'Mérida', 'IN_PERSON', ARRAY['Español'], 14, 'Posgrado en Psicología (dato ficticio)', 'Institución de ejemplo', '', '', 850, 55, 'Adultos', '18+', 'Perfil demostrativo; sin consulta activa', 'Mensajes en PsyMatch', 'Se muestra modalidad presencial como ejemplo de catálogo.', 'Diálogo y exploración de recursos personales.', 'La primera sesión se dedica a escuchar tu historia y tus preguntas.', 'Cada proceso es diferente; no existe un ritmo correcto.', 'Los objetivos se definen cuando resultan útiles para la persona.', 'No se prescriben actividades; se conversan opciones.', 'Se acuerda individualmente y puede variar.', 'Acompañar también significa dar espacio a lo que todavía no tiene palabras.', '{"structure":40,"direction":35,"practice":45,"formality":50,"time":75,"participation":55,"pace":35}', true, 'UNVERIFIED', NOW()),
  ('demo-profile-05', 'demo-user-05', 'ella', 'Mujer', 'Perfil de muestra para explorar el filtro de desarrollo personal y manejo emocional. Formación, experiencia y descripción son datos inventados.', 'Mérida', 'BOTH', ARRAY['Español'], 9, 'Psicología y formación complementaria (dato ficticio)', 'Institución de ejemplo', '', '', 780, 50, 'Adultos', '18+', 'Ejemplo de acompañamiento integrativo ficticio', 'Mensajes en PsyMatch', 'Podrían acordarse adaptaciones según necesidad (texto demostrativo).', 'Identificación de fortalezas y prácticas de atención plena.', 'Conversamos sobre lo que esperas de un proceso de terapia.', 'Integramos reflexión y recursos prácticos según cada persona.', 'Las herramientas se adaptan y nunca son requisito.', 'Las actividades son opcionales y se conversan en conjunto.', 'Se acuerda individualmente y puede variar.', 'Cada persona cuenta con recursos que pueden descubrirse y fortalecerse.', '{"structure":55,"direction":50,"practice":65,"formality":45,"time":55,"participation":60,"pace":60}', true, 'UNVERIFIED', NOW()),
  ('demo-profile-06', 'demo-user-06', 'ella', 'Mujer', 'Ejemplo ficticio de perfil enfocado en hábitos, autocuidado y etapas de estudio. Se incluye para mostrar variedad en la búsqueda.', 'Mérida', 'ONLINE', ARRAY['Español'], 5, 'Licenciatura en Psicología (dato ficticio)', 'Institución de ejemplo', '', '', 600, 50, 'Jóvenes y adultos', '18+', 'Ejemplo de perfil de catálogo; no ofrece atención real', 'Mensajes en PsyMatch', 'Formato en línea ilustrativo.', 'Organización de rutinas y registro de experiencias.', 'En el primer encuentro acordamos qué te gustaría explorar.', 'Un espacio participativo con metas flexibles.', 'Los pasos se deciden en conjunto y pueden cambiar.', 'Cualquier ejercicio es opcional.', 'Se acuerda individualmente y puede variar.', 'Los cambios sostenibles suelen empezar por pasos pequeños.', '{"structure":75,"direction":55,"practice":80,"formality":40,"time":45,"participation":75,"pace":75}', true, 'UNVERIFIED', NOW())
ON CONFLICT ("id") DO UPDATE SET
  "pronouns" = EXCLUDED."pronouns", "gender" = EXCLUDED."gender", "bio" = EXCLUDED."bio",
  "city" = EXCLUDED."city", "modality" = EXCLUDED."modality", "languages" = EXCLUDED."languages",
  "yearsExperience" = EXCLUDED."yearsExperience", "education" = EXCLUDED."education",
  "university" = EXCLUDED."university", "license" = EXCLUDED."license",
  "certifications" = EXCLUDED."certifications", "price" = EXCLUDED."price",
  "duration" = EXCLUDED."duration", "population" = EXCLUDED."population", "ageRange" = EXCLUDED."ageRange",
  "experience" = EXCLUDED."experience", "contactMethods" = EXCLUDED."contactMethods",
  "accessibility" = EXCLUDED."accessibility", "tools" = EXCLUDED."tools",
  "firstSession" = EXCLUDED."firstSession", "expectations" = EXCLUDED."expectations",
  "goalSetting" = EXCLUDED."goalSetting", "homework" = EXCLUDED."homework",
  "processLength" = EXCLUDED."processLength", "philosophy" = EXCLUDED."philosophy",
  "styles" = EXCLUDED."styles", "acceptingPatients" = true,
  "verificationStatus" = 'UNVERIFIED', "updatedAt" = NOW();

INSERT INTO "PsychologistSpecialty" ("psychologistId", "specialtyId", "updatedAt") VALUES
  ('demo-profile-01','anxiety', NOW()), ('demo-profile-01','emotions', NOW()),
  ('demo-profile-02','work', NOW()), ('demo-profile-02','anxiety', NOW()),
  ('demo-profile-03','esteem', NOW()), ('demo-profile-03','relationships', NOW()),
  ('demo-profile-04','grief', NOW()), ('demo-profile-04','relationships', NOW()),
  ('demo-profile-05','growth', NOW()), ('demo-profile-05','emotions', NOW()),
  ('demo-profile-06','habits', NOW()), ('demo-profile-06','study', NOW())
ON CONFLICT ("psychologistId", "specialtyId") DO NOTHING;

INSERT INTO "PsychologistApproach" ("psychologistId", "approachId", "updatedAt") VALUES
  ('demo-profile-01','cbt', NOW()), ('demo-profile-01','act', NOW()),
  ('demo-profile-02','cbt', NOW()), ('demo-profile-02','behavioral', NOW()),
  ('demo-profile-03','humanistic', NOW()), ('demo-profile-03','person', NOW()),
  ('demo-profile-04','integrative', NOW()), ('demo-profile-04','psychodynamic', NOW()),
  ('demo-profile-05','integrative', NOW()), ('demo-profile-05','act', NOW()),
  ('demo-profile-06','behavioral', NOW()), ('demo-profile-06','cbt', NOW())
ON CONFLICT ("psychologistId", "approachId") DO NOTHING;

COMMIT;
