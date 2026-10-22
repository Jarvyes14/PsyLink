# PsyLink

PsyLink es una aplicación web mobile-first para descubrir profesionales de psicología según preferencias estructuradas, expresar interés, crear una conexión aceptada, conversar y solicitar sesiones. El producto evita lenguaje diagnóstico y explica por qué recomienda cada perfil. Todos los perfiles precargados son ficticios y están identificados como datos de demostración. Las cuentas reales sólo descubren perfiles reales; las cuentas de demostración interactúan únicamente entre sí.

## Arquitectura

La aplicación usa Next.js 16 con App Router, React 19, TypeScript estricto y CSS responsive. Los Route Handlers forman la capa HTTP; Zod valida cada entrada; los servicios de dominio controlan perfiles, conexiones, citas y permisos; Prisma accede a PostgreSQL. En Vercel, los archivos cifrados se guardan en un Blob privado; localmente se usa `.local/storage`. Las sesiones opacas se guardan mediante cookies `HttpOnly`, `SameSite=Lax` y un hash SHA-256 en la base de datos. Las contraseñas usan `scrypt` con salt individual.

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

El modelo contiene `User`, `Session`, `PasswordReset`, `PatientProfile`, `PatientPreference`, `PsychologistProfile`, `ProfessionalVerification`, `StoredFile`, `Specialty`, `PsychologistSpecialty`, `TherapeuticApproach`, `PsychologistApproach`, `Availability`, `Interest`, `Favorite`, `PassedProfile`, `Match`, `Conversation`, `Message`, `Appointment`, `Report`, `Block` y `RateLimit`. Todas las entidades mutables tienen marcas de creación y actualización. `User.isDemo` separa explícitamente cuentas ficticias de reales. Las citas activas tienen restricciones de exclusión PostgreSQL para impedir que un paciente o profesional reserve horarios superpuestos, incluso ante solicitudes concurrentes.

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

Consulta [.env.example](./.env.example). `DATABASE_URL` y `STORAGE_KEY` son obligatorias. `STORAGE_KEY` debe contener 32 bytes codificados como 64 caracteres hexadecimales y no debe cambiar mientras existan archivos. `APP_URL` es opcional en Vercel si están habilitadas sus variables de sistema; configurarlo con el dominio canónico sigue siendo recomendable para los enlaces de recuperación. `DEMO_PASSWORD` sólo es necesario para cargar el seed. El correo local escribe mensajes en `.local/mail`; cualquier entorno público debe configurar SMTP. Nunca uses los valores del archivo de ejemplo como secretos reales.

## Credenciales demo

Las cuentas son `patient@psylink.demo`, `psychologist@psylink.demo` y `admin@psylink.demo`. La contraseña se genera localmente y está en `.local/demo-credentials.txt`. No se documenta una contraseña fija ni se incluye en el repositorio.

## Comandos

```powershell
npm run dev                 # servidor de desarrollo
npm run build               # build de producción
npm run build:vercel        # migraciones y build usados por Vercel
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

Antes de aceptar usuarios reales se debe: identificar legalmente al responsable del tratamiento; adaptar términos, privacidad, consentimiento y retención de respaldos a la jurisdicción; configurar un servicio SMTP; añadir escaneo antimalware al flujo de documentos; definir recuperación operativa; validar profesionales con un procedimiento humano; y realizar una auditoría de seguridad y accesibilidad independiente.

## Despliegue en Vercel con Supabase

La aplicación usa Supabase **sólo como PostgreSQL**: autenticación, sesiones y permisos siguen en el servidor de Next.js. No se necesitan `SUPABASE_URL` ni claves `anon`/`service_role` en Vercel. Como las tablas contienen información sensible y Prisma accede directamente a PostgreSQL, desactiva **Data API** en los ajustes de API de Supabase antes de permitir registros. No expongas estas tablas mediante la API pública de Supabase.

1. Crea un proyecto de Supabase y, en **Connect**, copia dos cadenas de conexión del mismo proyecto:
   - **Transaction pooler**, puerto `6543`, para `DATABASE_URL` (consultas de las Functions). Añade `pgbouncer=true&connection_limit=1` a los parámetros de la URL; por ejemplo, `?pgbouncer=true&connection_limit=1&sslmode=require`.
   - **Session pooler**, puerto `5432`, para `DIRECT_URL` (Prisma CLI y migraciones). Sirve también cuando la conexión directa IPv6 no es accesible desde el entorno de build. No añadas `pgbouncer=true` aquí.

   Usa el host y usuario exactos que muestra Supabase para **cada** modalidad; pueden diferir de los de la conexión directa. Sustituye la contraseña y codifica caracteres especiales como `@`, `#`, `?` y `&` en formato URL. `DIRECT_URL` es un secreto de despliegue: nunca debe llegar al navegador.
2. Importa el repositorio en Vercel, con la raíz del repositorio como **Root Directory**. `vercel.json` ejecuta `npm run build:vercel`: genera Prisma Client, aplica las migraciones mediante `DIRECT_URL` y construye Next.js con Webpack.
3. En **Storage** de Vercel, crea un Blob **Private** y conéctalo al proyecto para obtener `BLOB_READ_WRITE_TOKEN`.
4. Configura las variables siguientes en Vercel (además de `BLOB_READ_WRITE_TOKEN`):

   ```text
   DATABASE_URL=<Transaction pooler de Supabase, puerto 6543>
   DIRECT_URL=<Session pooler de Supabase, puerto 5432>
   STORAGE_DRIVER=vercel-blob
   STORAGE_KEY=<64 caracteres hexadecimales aleatorios>
   MAIL_TRANSPORT=smtp
   SMTP_HOST=<host del proveedor de correo>
   SMTP_PORT=587
   SMTP_USER=<usuario>
   SMTP_PASSWORD=<secreto>
   MAIL_FROM=Psicomatch <no-reply@tu-dominio.com>
   APP_URL=https://tu-dominio.com
   ```

   Genera `STORAGE_KEY` con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Consérvala: cambiarla impide descifrar archivos ya cargados. Si todavía no tienes dominio propio, puedes omitir `APP_URL` y habilitar **Automatically expose System Environment Variables**; la aplicación usará la URL de Vercel. Agrega `APP_URL` cuando conozcas el dominio definitivo.
5. Despliega. El primer build crea las tablas y habilita `btree_gist`, necesaria para las restricciones de citas. La conexión para migraciones debe tener permisos para crear tablas y extensiones. Si configuras Preview, usa otro proyecto de Supabase o una base separada: cada build Preview también ejecuta migraciones y no debe adelantar el esquema de Production.

Para cargar perfiles ficticios, define temporalmente `DEMO_PASSWORD`, descarga las variables del entorno de Vercel con su CLI y ejecuta `npm run db:seed` una sola vez. No cargues el seed en una instancia con usuarios reales. El correo requiere un proveedor SMTP externo; sin él, la recuperación de contraseñas no funcionará.

Los archivos llegan a una Function y por ello se limitan a 4 MB, por debajo del límite de payload de 4.5 MB de Vercel. Se almacenan en Blob privado y además cifrados con AES-256-GCM; las descargas siempre pasan por la autorización de la aplicación. El rate limit se guarda en PostgreSQL, de modo que es compartido entre instancias serverless.

## Limitaciones del MVP

- Los mensajes usan polling cada cinco segundos, no WebSockets.
- No hay pagos, videollamada, recordatorios por SMS ni sincronización con calendarios externos.
- El correo local sólo sirve para desarrollo.
- Los horarios usan la zona de Ciudad de México y no implementan recurrencias.
- La verificación administrativa demuestra el flujo, pero los datos precargados y documentos son ficticios.
- No existe cifrado de extremo a extremo para mensajes.
- La geolocalización por distancia no se activa; sólo se filtra por ciudad escrita, evitando recopilar GPS.

Las siguientes mejoras recomendadas son escaneo de malware, correo transaccional con webhooks de entrega, eventos realtime, recurrencias y zonas horarias por usuario, recordatorios, telemetría sin datos clínicos, revisión WCAG con tecnología asistiva y pruebas de penetración antes del uso real.
