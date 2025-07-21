'use client';

import ClienteForm from '../../../components/ClienteForm';
import ProtectedArea from '@/components/ProtectedArea';
import MenuLayout from '@/components/MenuLayout';

export default function NovoClientePage() {
  return (
    <MenuLayout>
      <ProtectedArea area="clientes">
        <ClienteForm returnToOS={true} />
      </ProtectedArea>
    </MenuLayout>
  );
}