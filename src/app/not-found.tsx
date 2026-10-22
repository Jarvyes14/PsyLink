import Link from 'next/link';
export default function NotFound() { return <main className="error-page"><span className="eyebrow">404 · Un pequeño desvío</span><h1>Este espacio no existe.</h1><p>Podemos volver al inicio y encontrar el camino.</p><Link className="button primary" href="/">Volver a Psicomatch</Link></main>; }
