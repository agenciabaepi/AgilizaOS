export const dynamic = 'force-dynamic';

import EmpresaDetalhesClient from '../EmpresaDetalhesClient';

export default async function EmpresaDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <EmpresaDetalhesClient empresaId={resolvedParams.id} />;
}

