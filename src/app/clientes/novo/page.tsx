'use client';

import { useSearchParams } from 'next/navigation';
import ClienteForm from '../../../components/ClienteForm';
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import MenuLayout from '@/components/MenuLayout';
import { Suspense } from 'react';

export default function NovoClientePage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovoClientePageInner />
    </Suspense>
  );
}

function NovoClientePageInner() {
  const searchParams = useSearchParams();
  const returnToOS = searchParams.get('returnToOS') === 'true';
  return (
    <MenuLayout>
      
        <ClienteForm returnToOS={returnToOS} />
      
    </MenuLayout>
  );
}