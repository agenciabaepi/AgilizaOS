'use client';

import AuthGuard from '@/components/AuthGuard';
import { PDVPage } from '@/components/caixa/pdv/PDVPage';

export default function CaixaPDVRoute() {
  return (
    <AuthGuard>
      <PDVPage />
    </AuthGuard>
  );
}
