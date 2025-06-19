'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function PainelMaster() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email !== 'lucas@hotmail.com') {
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
