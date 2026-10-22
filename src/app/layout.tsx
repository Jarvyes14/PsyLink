import type { Metadata, Viewport } from 'next';
import './globals.css';
import './responsive.css';
import './interaction.css';
export const metadata: Metadata = { title: 'Psicomatch — Un espacio para conectar contigo', description: 'Encuentra profesionales de psicología según tus preferencias, a tu ritmo.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f8f6f2' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="es" data-scroll-behavior="smooth"><body>{children}</body></html>; }
