'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Redireciona para a página de status (única página do link público com formulário de senha).
 * Mantido para compatibilidade com links/QR codes que apontam para /os/[id]/login.
 */
export default function OSLoginRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  useEffect(() => {
    if (id) router.replace(`/os/${id}/status`);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}
