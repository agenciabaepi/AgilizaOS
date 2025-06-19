'use client';

import { useEffect, useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export default function TesteSessao() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const verificarSessao = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Sessão carregada:', session);
      setSessionInfo(session);
    };

    verificarSessao();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Verificação de Sessão</h1>
      <pre className="bg-gray-100 p-4 rounded text-sm">
        {JSON.stringify(sessionInfo, null, 2)}
      </pre>
    </div>
  );
}