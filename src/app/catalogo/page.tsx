import Link from 'next/link';

/** Fallback quando alguém acessa /catalogo sem o slug da empresa. */
export default function CatalogoIndexPage() {
  return (
    <div className="gc-cat-state" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', background: '#f7f7f7' }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Catálogo</h1>
        <p style={{ color: '#6b7280', maxWidth: '36ch', margin: '0 auto 16px' }}>
          Acesse o catálogo pelo link da sua assistência, no formato /catalogo/seu-slug.
        </p>
        <Link href="/login" style={{ color: '#111', fontWeight: 600 }}>
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
