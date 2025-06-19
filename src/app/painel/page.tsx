'use client';
import { useEffect, useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function PainelMaster() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createPagesBrowserClient();

  useEffect(() => {
    const fetchEmpresas = async () => {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      console.log('Sessão:', session, sessionError);

      if (!session || !session.user) {
        console.log('Sem sessão, redirecionando...');
        router.push('/painel');
        return;
      }

      const email = session.user.email?.toLowerCase().trim();
      console.log('Email autenticado:', email);

      if (email !== 'lucas@hotmail.com') {
        console.log('Email não autorizado, redirecionando...');
        router.push('/acesso-bloqueado');
        return;
      }

      const { data, error } = await supabase.from('empresas').select('*');
      if (!error && data) {
        setEmpresas(data);
      }
    };

    fetchEmpresas();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Painel do Sistema</h1>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Empresa</th>
            <th className="p-2">Email</th>
            <th className="p-2">Plano</th>
            <th className="p-2">Status</th>
            <th className="p-2">Criada em</th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((empresa) => (
            <tr key={empresa.id} className="border-t">
              <td className="p-2">{empresa.nome}</td>
              <td className="p-2">{empresa.email}</td>
              <td className="p-2 capitalize">{empresa.plano}</td>
              <td className="p-2 capitalize">{empresa.status}</td>
              <td className="p-2">{new Date(empresa.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
