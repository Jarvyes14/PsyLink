export function appUrl() {
  const configured = process.env.APP_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const value = configured || (vercelHost ? `https://${vercelHost}` : 'http://127.0.0.1:3000');

  return new URL(value).origin;
}
