'use client';

import AuthGuard from '@/components/AuthGuard';
import MenuLayout from '@/components/MenuLayout';
import { PDVPage } from '@/components/caixa/pdv/PDVPage';
import '@/styles/pdv.css';

export default function CaixaPDVRoute() {
  return (
    <AuthGuard>
      <MenuLayout>
        <PDVPage />
      </MenuLayout>
    </AuthGuard>
  );
}
