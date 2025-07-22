'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiClipboard, FiSave, FiBox, FiTool, FiCamera } from 'react-icons/fi';
import MenuLayout from '@/components/MenuLayout';

export default function DetalheBancadaPage() {
  const params = useParams();
  const id = params?.id as string;
  interface OrdemServico {
    id: string;
    empresa_id: string;
    cliente_id: string;
    tecnico_id: string;
    status: string;
    created_at: string;
    atendente: string;
    tecnico: string;
    categoria: string;
    marca: string;
    modelo: string;
    cor: string;
    numero_serie: string;
    servico: string;
    qtd_servico: string;
    peca: string;
    qtd_peca: string;
    termo_garantia: string | null;
    relato: string;
    observacao: string;
    data_cadastro: string;
    numero_os: string;
    data_entrega: string | null;
    vencimento_garantia: string | null;
    valor_peca: string;
    valor_servico: string;
    desconto: string | null;
    valor_faturado: string;
    status_tecnico: string;
    acessorios: string;
    condicoes_equipamento: string;
    [key: string]: any;
  }
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusTecnico, setStatusTecnico] = useState('');
  const [laudo, setLaudo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [produtos, setProdutos] = useState<string>('');
  const [servicos, setServicos] = useState<string>('');
  // const [imagens, setImagens] = useState<File[]>([]); // Removido pois não está sendo usado
  const [salvando, setSalvando] = useState(false);
  const [statusTecnicoOptions, setStatusTecnicoOptions] = useState<{ id: string, nome: string }[]>([]);

  useEffect(() => {
    const fetchOS = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`*, cliente:cliente_id(nome)`)
        .eq('id', id)
        .single();
      if (!error && data) {
        setOs(data);
        setStatusTecnico(data.status_tecnico || '');
        setLaudo(data.laudo || '');
        setObservacoes(data.observacao || '');
        setProdutos(data.peca || '');
        setServicos(data.servico || '');
      }
      setLoading(false);
    };
    if (id) fetchOS();
  }, [id]);

  useEffect(() => {
    async function fetchStatusTecnico() {
      // Buscar status técnicos personalizados da empresa
      const { data: statusEmpresa } = await supabase
        .from('status')
        .select('id, nome')
        .eq('tipo', 'tecnico');
      // Buscar status técnicos fixos do sistema
      const { data: statusFixos } = await supabase
        .from('status_fixo')
        .select('id, nome')
        .eq('tipo', 'tecnico');
      setStatusTecnicoOptions([...(statusFixos || []), ...(statusEmpresa || [])]);
    }
    fetchStatusTecnico();
  }, []);

  const handleSalvar = async () => {
    setSalvando(true);
    const { error } = await supabase
      .from('ordens_servico')
      .update({
        status_tecnico: statusTecnico,
        laudo,
        observacao: observacoes,
        peca: produtos,
        servico: servicos,
      })
      .eq('id', id);
    setSalvando(false);
    if (!error) {
      alert('Dados salvos com sucesso!');
    } else {
      alert('Erro ao salvar: ' + error.message);
    }
  };

  // const steps = [
  //   { label: 'Orçamento', icon: <FiFileText /> },
  //   { label: 'Aberto', icon: <FiPlay /> },
  //   { label: 'Andamento', icon: <FiTool /> },
  //   { label: 'Concluído', icon: <FiCheck /> },
  //   { label: 'Faturado', icon: <FiDollarSign /> },
  //   { label: 'Finalizado', icon: <FiFlag /> }
  // ];

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
  // const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
  // const valor = ((os.valor_servico || 0) + (os.valor_peca || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
              <select
                className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring focus:ring-blue-100"
                value={statusTecnico}
                onChange={e => setStatusTecnico(e.target.value)}
              >
                <option value="">Selecione o status</option>
                {statusTecnicoOptions.map(opt => (
                  <option key={opt.id} value={opt.nome}>{opt.nome}</option>
                ))}
              </select>
            </div>
            {/* Produtos utilizados */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiBox className="text-blue-600" />
                Produtos utilizados
              </h2>
              <input
                type="text"
                className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring focus:ring-blue-100"
                placeholder="Produtos utilizados"
                value={produtos}
                onChange={e => setProdutos(e.target.value)}
              />
            </div>
          </div>

          {/* Serviços realizados */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiTool className="text-blue-600" />
              Serviços realizados
            </h2>
            <input
              type="text"
              className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring focus:ring-blue-100"
              placeholder="Serviços realizados"
              value={servicos}
              onChange={e => setServicos(e.target.value)}
            />
          </div>

          {/* Imagens do aparelho: campo removido para evitar erro de referência */}

          {/* Laudo Técnico */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiClipboard className="text-blue-600" />
              Laudo Técnico
            </h2>
            <textarea
              className="w-full border border-gray-300 px-4 py-3 rounded-lg text-sm min-h-[120px] focus:ring focus:ring-blue-100"
              value={laudo}
              onChange={e => setLaudo(e.target.value)}
              placeholder="Descreva o diagnóstico técnico com todos os detalhes relevantes..."
            />
          </div>

          {/* Observações técnicas */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiClipboard className="text-blue-600" />
              Observações técnicas
            </h2>
            <textarea
              className="w-full border border-gray-300 px-4 py-3 rounded-lg text-sm min-h-[80px] focus:ring focus:ring-blue-100"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Observações do técnico..."
            />
          </div>

          <div className="pt-2">
            <button
              className="w-fit inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              onClick={handleSalvar}
              disabled={salvando}
            >
              <FiSave /> {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}