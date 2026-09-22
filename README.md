# PsyLink

PsyLink es una aplicación web mobile-first para descubrir profesionales de psicología según preferencias estructuradas, expresar interés, crear una conexión aceptada, conversar y solicitar sesiones. El producto evita lenguaje diagnóstico y explica por qué recomienda cada perfil. Todos los perfiles precargados son ficticios y están identificados como datos de demostración.

## Arquitectura

La aplicación usa Next.js 16 con App Router, React 19, TypeScript estricto y CSS responsive. Los Route Handlers forman la capa HTTP; Zod valida cada entrada; los servicios de dominio controlan perfiles, conexiones, citas y permisos; Prisma accede a PostgreSQL. Las sesiones opacas se guardan mediante cookies `HttpOnly`, `SameSite=Lax` y un hash SHA-256 en la base de datos. Las contraseñas usan `scrypt` con salt individual.

```text
src/
  app/                 rutas, layout, errores y API
  components/          interfaz por flujo y componentes comunes
  domain/              catálogos y motor de compatibilidad
  lib/                 auth, Prisma, validación y utilidades
  services/            reglas de negocio y almacenamiento privado
prisma/
  migrations/          esquema SQL y restricciones de agenda
  schema.prisma        modelo relacional
  seed.ts              datos ficticios reproducibles
tests/
  *.test.ts            pruebas unitarias
  integration.ts       flujos con PostgreSQL
  e2e/                 recorridos Playwright por rol
scripts/               entorno y PostgreSQL local aislado
```

El modelo contiene `User`, `Session`, `PasswordReset`, `PatientProfile`, `PatientPreference`, `PsychologistProfile`, `ProfessionalVerification`, `StoredFile`, `Specialty`, `PsychologistSpecialty`, `TherapeuticApproach`, `PsychologistApproach`, `Availability`, `Interest`, `Favorite`, `PassedProfile`, `Match`, `Conversation`, `Message`, `Appointment`, `Report`, `Block` y `RateLimit`. Todas las entidades mutables tienen marcas de creación y actualización. Las citas activas tienen restricciones de exclusión PostgreSQL para impedir que un paciente o profesional reserve horarios superpuestos, incluso ante solicitudes concurrentes.

## Funcionalidad incluida

- Registro, login, logout, recuperación de contraseña con enlace de un solo uso, sesiones persistentes y rutas por rol.
- Onboarding por pasos para pacientes y profesionales.
- Descubrimiento de una tarjeta a la vez, swipe táctil, botones accesibles, filtros, descartes y guardados.
- Compatibilidad 0–100 con pesos centralizados y explicación concreta; presupuesto y modalidad pueden ser requisitos obligatorios.
- Solicitudes de interés, aceptación profesional, match, cierre de conexión y bloqueo.
- Conversaciones autorizadas únicamente para matches activos, estado leído y actualización periódica.
- Disponibilidad, solicitudes de sesión, confirmación, cancelación y finalización.
- Perfiles profesionales extensos, fotografía, enfoques y estilo de trabajo.
- Documentos de verificación privados y cifrados, revisión administrativa y estados completos.
- Reportes, desactivación de cuentas, estadísticas y gestión de usuarios.
- Eliminación de cuenta, páginas de privacidad, términos, ayuda inmediata, 404, carga y errores.

## Requisitos

- Node.js 22 o 24.
- PostgreSQL 17, o Docker Desktop.
- npm 10 o superior.

## Instalación local

En Windows con PostgreSQL 17 instalado, el proyecto puede iniciar una instancia aislada dentro de `.local/postgres`:

```powershell
npm install
npm run setup:env
npm run db:local
npm run db:migrate
npm run db:seed
npm run dev
```

Abre `http://127.0.0.1:3000`. `setup:env` crea `.env` con secretos aleatorios y escribe las credenciales demo en `.local/demo-credentials.txt`; ambos están ignorados por Git.

Para Docker, genera `.env`, exporta una contraseña y actualiza `DATABASE_URL` para que use esa misma contraseña y el puerto `55432` definido en `docker-compose.yml`:

```powershell
$env:POSTGRES_PASSWORD = '<una-contraseña-segura>'
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

## Variables de entorno

Consulta [.env.example](./.env.example). `DATABASE_URL`, `APP_URL`, `STORAGE_KEY` y `DEMO_PASSWORD` son obligatorias. `STORAGE_KEY` debe contener 32 bytes codificados como 64 caracteres hexadecimales. El correo local escribe mensajes de recuperación en `.local/mail`; cualquier entorno público debe configurar SMTP. Nunca uses los valores del archivo de ejemplo como secretos reales.

## Credenciales demo

Las cuentas son `patient@psylink.demo`, `psychologist@psylink.demo` y `admin@psylink.demo`. La contraseña se genera localmente y está en `.local/demo-credentials.txt`. No se documenta una contraseña fija ni se incluye en el repositorio.

## Comandos

```powershell
npm run dev                 # servidor de desarrollo
npm run build               # build de producción
npm start                   # ejecuta el build
npm run lint                # ESLint
npm run typecheck           # TypeScript estricto
npm test                    # unit tests
npm run test:integration    # integración con PostgreSQL
npm run test:e2e            # flujos críticos en navegador
npm run db:migrate          # aplica migraciones
npm run db:seed             # carga datos ficticios idempotentes
```

## Privacidad y seguridad

La autorización se comprueba en el servidor para cada conversación, cita, perfil privado y acción administrativa. Los documentos se validan por firma binaria, se cifran con AES-256-GCM y se guardan fuera de `public`. La aplicación limita intentos de autenticación y escrituras, valida `Origin` para mutaciones, envía cabeceras CSP y evita registrar mensajes, contraseñas o preferencias. Los datos sensibles no se usan para publicidad.

Antes de aceptar usuarios reales se debe: identificar legalmente al responsable del tratamiento; adaptar términos, privacidad, consentimiento y retención de respaldos a la jurisdicción; usar HTTPS; configurar un servicio SMTP; sustituir el almacenamiento local por un proveedor privado con antivirus y gestión de claves; añadir rate limiting compartido en el proxy o Redis; definir recuperación operativa; validar profesionales con un procedimiento humano; y realizar una auditoría de seguridad y accesibilidad independiente.

## Despliegue

Construye una imagen Node o despliega en una plataforma compatible con procesos persistentes y PostgreSQL. Ejecuta `prisma migrate deploy` antes de iniciar `npm start`. Monta `STORAGE_DIR` en un volumen privado si mantienes el adaptador local. Sitúa la aplicación tras HTTPS, conserva `APP_URL` con el origen exacto y no expongas el directorio de documentos. Para múltiples réplicas, usa almacenamiento de objetos privado y un rate limiter compartido.

## Limitaciones del MVP

- Los mensajes usan polling cada cinco segundos, no WebSockets.
- No hay pagos, videollamada, recordatorios por SMS ni sincronización con calendarios externos.
- El correo local sólo sirve para desarrollo.
- Los horarios usan la zona de Ciudad de México y no implementan recurrencias.
- La verificación administrativa demuestra el flujo, pero los datos precargados y documentos son ficticios.
- No existe cifrado de extremo a extremo para mensajes.
- La geolocalización por distancia no se activa; sólo se filtra por ciudad escrita, evitando recopilar GPS.

Las siguientes mejoras recomendadas son un adaptador S3/R2 con escaneo de malware, correo transaccional, eventos realtime, recurrencias y zonas horarias por usuario, recordatorios, telemetría sin datos clínicos, revisión WCAG con tecnología asistiva y pruebas de penetración antes del uso real.
