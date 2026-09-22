'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="error-page"><span className="eyebrow">Algo no salió como esperábamos</span><h1>Tomemos un momento.</h1><p>No pudimos cargar esta página. Puedes volver a intentarlo.</p><button className="button primary" onClick={reset}>Reintentar</button></main>; }
