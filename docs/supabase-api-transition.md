# Psicomatch en Supabase + Vercel

## Estado actual

El esquema de 23 tablas ya existe en el proyecto Supabase `uymkqyiuynpzspjxkvsw`. Las tablas de la app tienen RLS activado y no conceden acceso directo a `anon` ni a `authenticated`: el navegador llama a `/api/*`, y el servidor comprueba la identidad de Supabase Auth y los permisos antes de usar la Data API con la clave secreta. Sólo se cargaron los catálogos de 10 especialidades y 12 enfoques: no hay profesionales ni cuentas migradas. No se insertaron perfiles de demostración.

Las rutas de registro, confirmación de correo, login, recuperación, perfiles, preferencias, intereses, conexiones, mensajes, citas, disponibilidad, archivos, verificación, reportes, bloqueos y administración tienen implementación con la API de Supabase. La lectura pública de `/discover`, `/saved` y perfiles no pide cuenta; `Me interesa` y `Quiero agendar` sí la piden. Los guardados de visitantes están sólo en el navegador.

**Pendiente de verificación real:** falta configurar `SUPABASE_SECRET_KEY` y ejecutar pruebas de punta a punta con usuarios paciente, profesional y administrador. Las operaciones con varios pasos (por ejemplo, aceptar una solicitud y crear el chat) todavía no son una transacción atómica; no habilitar datos sensibles de usuarios reales hasta endurecer y probar esos casos. Las cuentas antiguas no conservan su contraseña: sus titulares tendrán que crear una identidad en Supabase Auth con el mismo correo verificado y restablecer la contraseña.

## Variables

En Vercel configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_URL` (dominio público HTTPS), `STORAGE_KEY` (64 caracteres hexadecimales) y `STORAGE_DRIVER=supabase`. La clave secreta y `STORAGE_KEY` son sólo de servidor; nunca uses el prefijo `NEXT_PUBLIC_` para ellas. No necesitas `DATABASE_URL` ni `DIRECT_URL` para el despliegue nuevo. `build:vercel` ya no ejecuta `prisma migrate deploy` ni abre conexión PostgreSQL.

En Supabase Auth configura el **Site URL** con tu dominio de Vercel y agrega a Redirect URLs `https://tu-dominio/auth/callback` y `https://tu-dominio/auth/callback?next=/reset-password`. Haz lo equivalente para `http://127.0.0.1:3000` cuando pruebes localmente. Mantén activa la confirmación por correo y configura un proveedor SMTP propio antes de usar el registro a escala. El bucket privado `psicomatch-private` se crea en la primera subida de archivos usando la clave secreta; los bytes se cifran con `STORAGE_KEY` antes de subirlos.

Para tener perfiles reales, un profesional debe registrarse, confirmar su correo, completar su perfil y publicar horarios. Para revisar credenciales y reportes hace falta una cuenta administradora, promovida de forma controlada desde Supabase: primero registra y confirma una cuenta normal, luego cambia `"User"."role"` a `ADMIN` para el `authId` esperado usando el editor SQL. Nunca habilites un selector de rol administrador en el cliente.

## Faltantes antes de producción

- Configurar la clave secreta y probar las operaciones privadas con cuentas de cada rol, incluyendo permisos negativos.
- Hacer atómicas las operaciones de varios pasos que afectan matches, verificaciones, bloqueos y eliminación de cuentas.
- Definir respaldo, retención, responsable del tratamiento y términos adecuados para información de salud mental.
- Verificar correo, URL de retorno, documentos privados y correos de recuperación en el dominio final.
