'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import toast from 'react-hot-toast';
import { FiLink, FiExternalLink, FiPrinter, FiShield } from 'react-icons/fi';

export default function LinkPublicoPage() {
  const { user, empresaData } = useAuth();
  const { podeAcessar } = useConfigPermission('empresa');
  const [ativo, setAtivo] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!empresaData?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('link_publico_ativo')
          .eq('id', empresaData.id)
          .single();
        if (error) {
          // Coluna pode não existir ainda (migração não rodou): tratar como true
          if (error.code === 'PGRST116' || error.message?.includes('link_publico_ativo')) {
            setAtivo(true);
          } else {
            console.error('Erro ao carregar link_publico_ativo:', error);
            toast.error('Erro ao carregar configuração');
          }
        } else if (data && typeof data.link_publico_ativo === 'boolean') {
          setAtivo(data.link_publico_ativo);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaData?.id]);

  const salvar = async () => {
    if (!empresaData?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ link_publico_ativo: ativo })
        .eq('id', empresaData.id);

      if (error) {
        console.error('Erro ao salvar:', error);
        toast.error('Erro ao salvar: ' + (error.message || 'tente novamente'));
        return;
      }
      toast.success(ativo ? 'Link público ativado.' : 'Link público desativado.');
    } catch (e) {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (!podeAcessar) return <AcessoNegadoComponent />;

  if (!loading && !empresaData?.id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-amber-800">Carregue os dados da empresa primeiro na aba Empresa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Link Público</h2>
        <p className="text-gray-600 text-sm mt-1">
          Ative ou desative o acompanhamento da OS pelo cliente via link público. Ao desativar, tudo relacionado é ocultado.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900 flex items-center gap-2">
              <FiLink className="w-5 h-5 text-blue-600" />
              Habilitar link público
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Quando ativo: exibe senha de acesso, botão &quot;Ver Status&quot;, QR code nas impressões e páginas de acompanhamento. Quando desativado: todos esses itens são ocultados.
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              className="sr-only"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              disabled={loading}
            />
            <span
              className={`w-10 h-6 flex items-center bg-gray-200 rounded-full p-1 transition ${ativo ? '!bg-green-500' : ''} ${loading ? 'opacity-60' : ''}`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${ativo ? 'translate-x-4' : ''}`} />
            </span>
          </label>
        </div>
        <div className="mt-3 text-right">
          <button
            className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50"
            disabled={saving || loading}
            onClick={salvar}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 bg-white">
        <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-amber-500" />
          O que é ocultado ao desativar
        </div>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li className="flex items-center gap-2">
            <FiShield className="w-4 h-4 text-gray-400 shrink-0" />
            Senha de acesso para o cliente
          </li>
          <li className="flex items-center gap-2">
            <FiExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
            Botão &quot;Ver Status&quot; na tela de visualizar OS
          </li>
          <li className="flex items-center gap-2">
            <FiPrinter className="w-4 h-4 text-gray-400 shrink-0" />
            QR code e senha nas impressões (padrão, 2 vias e cupom)
          </li>
          <li className="flex items-center gap-2">
            <FiLink className="w-4 h-4 text-gray-400 shrink-0" />
            Acesso às páginas de login e status público da OS
          </li>
        </ul>
      </div>
    </div>
  );
}
