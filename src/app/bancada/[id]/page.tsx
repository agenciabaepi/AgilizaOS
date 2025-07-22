'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiClipboard, FiSave, FiBox, FiTool, FiCamera, FiFileText, FiPlay, FiCheck, FiDollarSign, FiFlag } from 'react-icons/fi';
import MenuLayout from '@/components/MenuLayout';

export default function DetalheBancadaPage() {
  const params = useParams();
  const id = params?.id as string;
  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [laudo, setLaudo] = useState('');
  const [status, setStatus] = useState('');
  const [peca, setPeca] = useState('');
  const [servico, setServico] = useState('');
  const [precoPeca, setPrecoPeca] = useState('0.00');
  const [precoServico, setPrecoServico] = useState('0.00');

  useEffect(() => {
    const fetchOS = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`*, cliente:cliente_id(nome), empresa:empresa_id(nome), usuarios:tecnico_id(nome)`)
        .eq('id', id)
        .single();
      if (!error && data) {
        setOs(data);
        setStatus(data.status || '');
        setLaudo(data.laudo || '');
        setPeca(data.peca || '');
        setServico(data.servico || '');
        setPrecoPeca(data.valor_peca ? String(data.valor_peca) : '0.00');
        setPrecoServico(data.valor_servico ? String(data.valor_servico) : '0.00');
      }
      setLoading(false);
    };
    if (id) fetchOS();
  }, [id]);

  const steps = [
    { label: 'Orçamento', icon: <FiFileText /> },
    { label: 'Aberto', icon: <FiPlay /> },
    { label: 'Andamento', icon: <FiTool /> },
    { label: 'Concluído', icon: <FiCheck /> },
    { label: 'Faturado', icon: <FiDollarSign /> },
    { label: 'Finalizado', icon: <FiFlag /> }
  ];

  if (loading) {
    return (
      <MenuLayout>
        <div className="px-10 py-8 max-w-7xl mx-auto text-center text-gray-500">Carregando OS...</div>
      </MenuLayout>
    );
  }

  if (!os) {
    return (
      <MenuLayout>
        <div className="px-10 py-8 max-w-7xl mx-auto text-center text-red-500">Ordem de serviço não encontrada.</div>
      </MenuLayout>
    );
  }

  const aparelho = [os.categoria, os.marca, os.modelo, os.cor].filter(Boolean).join(' ');
  const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
  const valor = ((os.valor_servico || 0) + (os.valor_peca || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MenuLayout>
      <div className="px-10 py-8 max-w-7xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center gap-2"
        >
          ← Voltar para Bancada
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <FiClipboard className="text-blue-600" />
          Ordem #{os.numero_os || os.id}
        </h1>

        {/* Barra de progresso da OS (mock, pode ser melhorada com status reais) */}
        {/* ... manter steps ou adaptar conforme status reais ... */}

        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <FiClipboard className="text-blue-600" />
            Detalhes da OS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm text-gray-700">
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Status da OS</p>
              <p className="text-base text-gray-800">{os.status || '---'}</p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Modelo do Aparelho</p>
              <p className="text-base text-gray-800">{aparelho || '---'}</p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Relato do cliente</p>
              <p className="text-base text-gray-800 leading-snug">
                {os.relato || '---'}
              </p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Acessórios</p>
              <p className="text-base text-gray-800">{os.acessorios || '---'}</p>
            </div>
            <div className="lg:col-span-3">
              <p className="text-[13px] font-medium text-gray-500 mb-1">Checklist</p>
              <p className="text-base text-gray-800">{os.condicoes_equipamento || '---'}</p>
            </div>
          </div>
        </section>

        <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Status Técnico */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiClipboard className="text-blue-600" />
                Status Técnico
              </h2>
              <p className="text-base text-gray-800">{os.status_tecnico || '---'}</p>
            </div>
            {/* Peça utilizada */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiBox className="text-blue-600" />
                Peça utilizada
              </h2>
              <p className="text-base text-gray-800">{os.peca || '---'}</p>
              <p className="text-sm text-gray-600">Preço: <span className="font-semibold text-blue-600">R$ {os.valor_peca?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span></p>
            </div>
          </div>

          {/* Serviço realizado */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiTool className="text-blue-600" />
              Serviço realizado
            </h2>
            <p className="text-base text-gray-800">{os.servico || '---'}</p>
            <p className="text-sm text-gray-600">Preço: <span className="font-semibold text-blue-600">R$ {os.valor_servico?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span></p>
          </div>

          {/* Imagens */}
          {/* Aqui você pode exibir imagens reais se houver campo no banco */}

          {/* Laudo Técnico */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiClipboard className="text-blue-600" />
              Laudo Técnico
            </h2>
            <p className="text-base text-gray-800">{os.laudo || '---'}</p>
          </div>

          <div className="pt-2">
            <button className="w-fit inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              <FiSave /> Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}