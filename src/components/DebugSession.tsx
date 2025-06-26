'use client';

import { useEffect, useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabase = createPagesBrowserClient();

export default function DebugSession() {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        const { data: usuarioData, error: userError } = await supabase
          .from('usuarios')
          .select('empresa_id, id, nome, auth_user_id')
          .eq('auth_user_id', session.user.id)
          .single();

        setUserInfo({
          authUser: session.user,
          empresa_id: usuarioData?.empresa_id,
          usuario: usuarioData,
          erro: userError,
        });
      } else {
        setUserInfo({ erro: error });
      }
    };

    fetchSession();
  }, []);

  return (
    <pre className="text-xs bg-gray-100 p-4 mt-4 rounded">
      {JSON.stringify(userInfo, null, 2)}
    </pre>
  );
}