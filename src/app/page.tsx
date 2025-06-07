'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Home() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const redirecionar = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: perfil, error } = await supabase
        .from('usuarios')
        .select('tipo')
        .eq('id', session.user.id)
        .single();

      if (error || !perfil) {
        router.replace('/login');
        return;
      }

      // Redirecionar uma única vez para o dashboard correto
      router.replace(perfil.tipo === 'tecnico'
        ? '/dashboard/tecnico'
        : '/dashboard/admin');
    };

    redirecionar();
  }, []);

  return null;
}