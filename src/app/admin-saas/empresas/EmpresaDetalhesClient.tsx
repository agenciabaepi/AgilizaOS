'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { FiArrowLeft, FiDollarSign, FiUsers, FiBox, FiFileText, FiTrendingUp, FiCheck, FiX, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { BuildingOfficeIcon as FiBuilding } from '@heroicons/react/24/outline';

type EmpresaDetalhes = {
  id: string;
  nome: string;
  email?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  cpf?: string | null;
  status?: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
  plano?: string | null;
  logo_url?: string | null;
  website?: string | null;
  estado?: string | null;
  cep?: string | null;
  metrics?: {
    usuarios: number;
    produtos: number;
    servicos: number;
    ordens: number;
    usoMb: number;
  };
  billing?: {
    plano: { id: string | null; nome: string };
    assinaturaStatus: string | null;
    proximaCobranca: string | null;
    vencido: boolean;
    cobrancaStatus: string;
    ultimoPagamentoStatus: string | null;
    ultimoPagamentoPagoEm: string | null;
    ultimoPagamentoValor: number | null;
  };
  recursos_customizados?: Record<string, boolean> | null;
};

// Modal de Alterar Plano (definido antes do componente principal)
const ModalAlterarPlano = ({ empresa, onClose, onSuccess }: { empresa: EmpresaDetalhes; onClose: () => void; onSuccess: () => void }) => {
  const [planos, setPlanos] = useState<Array<{ id: string; nome: string; descricao: string; preco: number }>>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>(empresa.billing?.plano?.id || '');
  const [observacoes, setObservacoes] = useState('');
  const [alterandoPlano, setAlterandoPlano] = useState(false);

  useEffect(() => {
    async function fetchPlanos() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
        const res = await fetch(`${baseUrl}/api/admin-saas/planos`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.ok) {
          setPlanos(json.planos || []);
        }
      } catch (err) {
        console.error('Erro ao buscar planos:', err);
      }
    }
    fetchPlanos();
  }, []);

  async function confirmarAlterarPlano() {
    if (!planoSelecionado) return;

    setAlterandoPlano(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresa.id}/alterar-plano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano_id: planoSelecionado,
          observacoes: observacoes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao alterar plano');
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar plano');
    } finally {
      setAlterandoPlano(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Plano da Empresa</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <div className="text-sm text-gray-900 font-medium">{empresa.nome}</div>
            {empresa.billing?.plano?.nome && (
              <div className="text-xs text-gray-500 mt-1">
                Plano atual: <span className="font-medium">{empresa.billing.plano.nome}</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Novo Plano</label>
            <select
              value={planoSelecionado}
              onChange={(e) => setPlanoSelecionado(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Selecione um plano</option>
              {planos.map((plano) => (
                <option key={plano.id} value={plano.id}>
                  {plano.nome} - R$ {plano.preco.toFixed(2)}/mês
                </option>
              ))}
            </select>
            {planos.find(p => p.id === planoSelecionado) && (
              <div className="mt-2 text-xs text-gray-600">
                {planos.find(p => p.id === planoSelecionado)?.descricao}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              rows={3}
              placeholder="Observações sobre a alteração do plano..."
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-300 hover:bg-gray-50"
              disabled={alterandoPlano}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmarAlterarPlano}
              className="bg-gray-900 hover:bg-gray-800 text-white"
              disabled={!planoSelecionado || alterandoPlano}
            >
              {alterandoPlano ? 'Alterando...' : 'Confirmar Alteração'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal de Gerenciar Recursos (definido antes do componente principal)
const ModalGerenciarRecursos = ({ empresa, onClose, onSuccess }: { empresa: EmpresaDetalhes; onClose: () => void; onSuccess: () => void }) => {
  const [recursosCustomizados, setRecursosCustomizados] = useState<Record<string, boolean>>({});
  const [salvandoRecursos, setSalvandoRecursos] = useState(false);

  useEffect(() => {
    async function fetchRecursos() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
        const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresa.id}/recursos`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.ok) {
          setRecursosCustomizados(json.recursos || {});
        } else {
          setRecursosCustomizados({});
        }
      } catch (err) {
        console.error('Erro ao buscar recursos:', err);
        setRecursosCustomizados({});
      }
    }
    fetchRecursos();
  }, [empresa.id]);

  async function confirmarSalvarRecursos() {
    setSalvandoRecursos(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresa.id}/recursos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recursos: recursosCustomizados }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao salvar recursos');
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar recursos');
    } finally {
      setSalvandoRecursos(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciar Recursos - {empresa.nome}</h3>
        <p className="text-sm text-gray-600 mb-6">
          Libere ou bloqueie recursos específicos para esta empresa. 
          <br />
          <span className="font-medium">Por padrão, os recursos seguem o plano da empresa.</span>
          <br />
          <span className="text-xs text-gray-500">Recursos marcados aqui sobrescrevem os recursos do plano.</span>
        </p>
        
        <div className="space-y-4 mb-6">
          {/* Financeiro */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Módulo Financeiro</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['financeiro'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    financeiro: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Financeiro Completo</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['vendas'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    vendas: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Vendas</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['contas_pagar'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    contas_pagar: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Contas a Pagar</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['movimentacao_caixa'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    movimentacao_caixa: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Movimentações de Caixa</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['lucro_desempenho'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    lucro_desempenho: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Lucro & Desempenho</span>
              </label>
            </div>
          </div>

          {/* WhatsApp e Automações */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Automações</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['whatsapp'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    whatsapp: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">WhatsApp</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['chatgpt'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    chatgpt: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">ChatGPT / IA</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursosCustomizados['editor_foto'] === true}
                  onChange={(e) => setRecursosCustomizados({
                    ...recursosCustomizados,
                    editor_foto: e.target.checked
                  })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Editor de Fotos</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-yellow-800">
            <strong>Nota:</strong> Para remover todas as customizações e voltar a usar apenas os recursos do plano, 
            desmarque todos os recursos e salve.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-300 hover:bg-gray-50"
            disabled={salvandoRecursos}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmarSalvarRecursos}
            className="bg-gray-900 hover:bg-gray-800 text-white"
            disabled={salvandoRecursos}
          >
            {salvandoRecursos ? 'Salvando...' : 'Salvar Recursos'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function EmpresaDetalhesClient({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaDetalhes | null>(null);
  const [showAlterarPlano, setShowAlterarPlano] = useState(false);
  const [showGerenciarRecursos, setShowGerenciarRecursos] = useState(false);

  // Função para recarregar dados da empresa
  const recarregarEmpresa = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || 'Falha ao carregar empresa');
      setEmpresa(json.empresa);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Não foi possível carregar os detalhes da empresa');
    } finally {
      setLoading(false);
    }
  };

  // Buscar detalhes da empresa
  useEffect(() => {
    if (!empresaId) return;
    recarregarEmpresa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function patchEmpresa(payload: Record<string, unknown>) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error('Falha na atualização');
    // Recarregar dados
    const res2 = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}`, { cache: 'no-store' });
    const json2 = await res2.json();
    if (res2.ok && json2.ok) {
      setEmpresa(json2.empresa);
    }
  }

  async function handleToggleActive() {
    if (!empresa) return;
    await patchEmpresa({ ativo: !empresa.ativo });
  }

  async function handleApprove() {
    await patchEmpresa({ status: 'aprovada', ativo: true });
  }

  async function handleReject() {
    await patchEmpresa({ status: 'reprovada', ativo: false });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error || !empresa) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Empresa não encontrada'}
        </div>
        <Button onClick={() => router.push('/admin-saas/empresas')} className="mt-4">
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin-saas/empresas')}
            className="border-gray-300"
          >
            <FiArrowLeft className="mr-2" />
            Voltar
          </Button>
          {empresa.logo_url ? (
            <img 
              src={empresa.logo_url} 
              alt={empresa.nome}
              className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-gray-200 shadow-sm">
              <span className="text-gray-400 text-2xl font-bold">
                {empresa.nome.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{empresa.nome}</h1>
            <p className="text-sm text-gray-500">Detalhes completos da empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {empresa.status === 'pendente' && (
            <>
              <Button
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FiCheck className="mr-2" />
                Aprovar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                className="bg-red-600 hover:bg-red-700"
              >
                <FiX className="mr-2" />
                Reprovar
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={handleToggleActive}
            className={empresa.ativo ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}
          >
            {empresa.ativo ? (
              <>
                <FiToggleRight className="mr-2" />
                Desativar
              </>
            ) : (
              <>
                <FiToggleLeft className="mr-2" />
                Ativar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cards de Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <FiBuilding className="text-blue-600 w-6 h-6" />
            </div>
            {empresa.status && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${empresa.status === 'aprovada' ? 'bg-green-100 text-green-800' : ''}
                ${empresa.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${empresa.status === 'reprovada' ? 'bg-red-100 text-red-800' : ''}
              `}>
                {empresa.status}
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Status</div>
          <div className="text-2xl font-bold text-gray-900">
            {empresa.ativo ? 'Ativa' : 'Inativa'}
          </div>
        </div>

        {/* Plano */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <FiDollarSign className="text-purple-600" size={24} />
            </div>
            {empresa.billing?.cobrancaStatus && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                empresa.billing.cobrancaStatus === 'Em dia' ? 'bg-green-100 text-green-800' :
                empresa.billing.cobrancaStatus === 'Trial' ? 'bg-yellow-100 text-yellow-800' :
                empresa.billing.cobrancaStatus === 'Vencido' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-700'
              }`}>
                {empresa.billing.cobrancaStatus}
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Plano</div>
          <div className="text-2xl font-bold text-gray-900">
            {empresa.billing?.plano?.nome || 'Acesso Completo'}
          </div>
        </div>

        {/* Usuários */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center mb-4">
            <FiUsers className="text-green-600" size={24} />
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Usuários</div>
          <div className="text-2xl font-bold text-gray-900">{empresa.metrics?.usuarios ?? 0}</div>
        </div>

        {/* Ordens de Serviço */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center mb-4">
            <FiFileText className="text-orange-600" size={24} />
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Ordens de Serviço</div>
          <div className="text-2xl font-bold text-gray-900">{empresa.metrics?.ordens ?? 0}</div>
        </div>
      </div>

      {/* Seções de Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações da Empresa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações da Empresa</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Nome</div>
              <div className="text-sm text-gray-900">{empresa.nome}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">E-mail</div>
              <div className={`text-sm ${empresa.email ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.email || 'Não informado'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">CNPJ</div>
              <div className={`text-sm ${empresa.cnpj ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.cnpj || 'Não informado'}
              </div>
            </div>
            {empresa.cpf && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">CPF</div>
                <div className="text-sm text-gray-900">{empresa.cpf}</div>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Telefone</div>
              <div className={`text-sm ${empresa.telefone ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.telefone || 'Não informado'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Endereço</div>
              <div className={`text-sm ${empresa.endereco ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.endereco || 'Não informado'}
              </div>
            </div>
            {empresa.cidade && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Cidade</div>
                <div className="text-sm text-gray-900">{empresa.cidade}</div>
              </div>
            )}
            {empresa.estado && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Estado</div>
                <div className="text-sm text-gray-900">{empresa.estado}</div>
              </div>
            )}
            {empresa.cep && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">CEP</div>
                <div className="text-sm text-gray-900">{empresa.cep}</div>
              </div>
            )}
            {empresa.website && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Website</div>
                <div className="text-sm text-gray-900">
                  <a href={empresa.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {empresa.website}
                  </a>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Logo</div>
              <div className={`text-sm ${empresa.logo_url ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.logo_url ? (
                  <img 
                    src={empresa.logo_url} 
                    alt="Logo"
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200 mt-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : 'Não informado'}
              </div>
            </div>
            {empresa.created_at && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Criada em</div>
                <div className="text-sm text-gray-900">
                  {new Date(empresa.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiUsers className="text-gray-400" size={20} />
                <span className="text-sm text-gray-700">Usuários</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{empresa.metrics?.usuarios ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiBox className="text-gray-400" size={20} />
                <span className="text-sm text-gray-700">Produtos</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{empresa.metrics?.produtos ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiFileText className="text-gray-400" size={20} />
                <span className="text-sm text-gray-700">Serviços</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{empresa.metrics?.servicos ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiTrendingUp className="text-gray-400" size={20} />
                <span className="text-sm text-gray-700">Ordens de Serviço</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{empresa.metrics?.ordens ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiDollarSign className="text-gray-400" size={20} />
                <span className="text-sm text-gray-700">Storage (MB)</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{empresa.metrics?.usoMb ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Dados Faltantes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Faltantes</h2>
          <div className="space-y-2">
            {!empresa.logo_url && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Logo da empresa não cadastrado
              </div>
            )}
            {!empresa.email && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                E-mail não informado
              </div>
            )}
            {!empresa.cnpj && !empresa.cpf && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                CNPJ/CPF não informado
              </div>
            )}
            {!empresa.telefone && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Telefone não informado
              </div>
            )}
            {!empresa.endereco && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Endereço não informado
              </div>
            )}
            {empresa.logo_url && empresa.email && (empresa.cnpj || empresa.cpf) && empresa.telefone && empresa.endereco && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Todos os dados principais estão preenchidos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowAlterarPlano(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FiDollarSign className="mr-2" />
            Alterar Plano
          </Button>
          <Button
            onClick={() => setShowGerenciarRecursos(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <FiToggleRight className="mr-2" />
            Gerenciar Recursos
          </Button>
        </div>
      </div>

      {/* Modais */}
      {showAlterarPlano && empresa ? (
        <ModalAlterarPlano 
          empresa={empresa} 
          onClose={() => setShowAlterarPlano(false)} 
          onSuccess={async () => {
            setShowAlterarPlano(false);
            await recarregarEmpresa();
          }} 
        />
      ) : null}
      
      {showGerenciarRecursos && empresa ? (
        <ModalGerenciarRecursos 
          empresa={empresa} 
          onClose={() => setShowGerenciarRecursos(false)} 
          onSuccess={async () => {
            setShowGerenciarRecursos(false);
            await recarregarEmpresa();
          }} 
        />
      ) : null}
    </div>
  );
}
