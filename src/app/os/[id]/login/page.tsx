'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiShieldOff } from 'react-icons/fi';
import Link from 'next/link';

export default function OSLoginPublicoPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [loading, setLoading] = useState(true);
  const [desativado, setDesativado] = useState<boolean | null>(null);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNaoEncontrada(true);
      return;
    }
    (async () => {
      setLoading(true);
      setDesativado(null);
      setNaoEncontrada(false);
      try {
        const { data, error } = await supabase
          .from('ordens_servico')
          .select('id, empresa_id, empresas(link_publico_ativo)')
          .or(`id.eq.${id},numero_os.eq.${id}`)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar OS:', error);
          setNaoEncontrada(true);
          setLoading(false);
          return;
        }
        if (!data) {
          setNaoEncontrada(true);
          setLoading(false);
          return;
        }
        const ativo = (data as any).empresas?.link_publico_ativo ?? true;
        setDesativado(!ativo);
      } catch (e) {
        setNaoEncontrada(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (naoEncontrada) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">OS não encontrada</h1>
          <p className="text-gray-600 mb-4">Verifique o link informado.</p>
          <Link href="/os/buscar" className="text-blue-600 hover:underline">Acompanhar outra OS</Link>
        </div>
      </div>
    );
  }

  if (desativado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center bg-white rounded-xl border border-gray-200 p-8">
          <FiShieldOff className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Recurso desativado</h1>
          <p className="text-gray-600">
            O acesso por link público está desativado nas configurações desta empresa.
          </p>
        </div>
      </div>
    );
  }

  // Link ativo: placeholder para o formulário de senha (pode ser substituído pela implementação completa)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Acesso à OS</h1>
        <p className="text-gray-600">Informe a senha da sua OS para acompanhar o status.</p>
        <p className="mt-2 text-sm text-gray-500">A senha está no recibo que você recebeu.</p>
      </div>
    </div>
  );
}
