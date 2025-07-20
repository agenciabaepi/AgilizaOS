'use client';

import ClienteForm from '../../../components/ClienteForm';
import ProtectedArea from '@/components/ProtectedArea';

export default function NovoClientePage() {
  return (
    <ProtectedArea area="clientes">
      <ClienteForm />
    </ProtectedArea>
  );
}