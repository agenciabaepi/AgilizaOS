'use client';

import { useSearchParams } from 'next/navigation';
import ClienteForm from '../../../components/ClienteForm';
import ProtectedArea from '@/components/ProtectedArea';
import MenuLayout from '@/components/MenuLayout';

export default function NovoClientePage() {
  const searchParams = useSearchParams();
  const returnToOS = searchParams.get('returnToOS') === 'true';
  return (
    <MenuLayout>
      <ProtectedArea area="clientes">
        <ClienteForm returnToOS={returnToOS} />
      </ProtectedArea>
    </MenuLayout>
  );
}