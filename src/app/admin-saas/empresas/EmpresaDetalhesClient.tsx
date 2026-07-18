'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { FiArrowLeft, FiDollarSign, FiUsers, FiBox, FiFileText, FiTrendingUp, FiCheck, FiX, FiToggleLeft, FiToggleRight, FiSlash, FiEdit2, FiCreditCard, FiAlertTriangle, FiTrash2 } from 'react-icons/fi';
import { BuildingOfficeIcon as FiBuilding } from '@heroicons/react/24/outline';
import { DIAS_TRIAL_GRATIS } from '@/config/trial';
import AdminEmpresaClientesSection from './AdminEmpresaClientesSection';
import AdminEmpresaUsuariosSection from './AdminEmpresaUsuariosSection';
import AdminEmpresaPagamentosSection from './AdminEmpresaPagamentosSection';
import PremiumRecursosForm from '@/components/admin/PremiumRecursosForm';
import AdminAlterarPlanoModal from '@/components/admin/AdminAlterarPlanoModal';
import AdminEmpresaValorPorPlano from '@/components/admin/AdminEmpresaValorPorPlano';
import type { PremiumModule } from '@/config/planModules';
import type { PlanoSlug } from '@/config/planModules';

type AbaEmpresa = 'geral' | 'pagamentos';

function formatarDataCurta(iso: string | null | undefined) {
  if (!iso) return '—';
  const s = String(iso).trim();
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) {
    const [y, m, d] = head[1].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

const PRESETS_DIAS_TRIAL = [7, 15, 30, 60, 90] as const;
const EXCLUIR_EMPRESA_FRASE = 'EXCLUIR PERMANENTEMENTE';

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
  sistema_liberado?: boolean | null;
  created_at?: string | null;
  plano?: string | null;
  logo_url?: string | null;
  website?: string | null;
  metrics?: {
    usuarios: number;
    produtos: number;
    servicos: number;
    ordens: number;
    usoMb: number | null;
  };
  dias_trial?: number | null;
  billing?: {
    plano: { id: string | null; nome: string; slug?: string | null };
    assinaturaStatus: string | null;
    /** Valor mensal gravado em `assinaturas.valor` (pode diferir do preço do plano) */
    valorMensal?: number | null;
    /** Preço de catálogo do plano atual */
    precoCatalogo?: number | null;
    proximaCobranca: string | null;
    vencido: boolean;
    cobrancaStatus: string;
    ultimoPagamentoStatus: string | null;
    ultimoPagamentoPagoEm: string | null;
    ultimoPagamentoValor: number | null;
    dataTrialFim?: string | null;
    diasTrialRestantes?: number | null;
    diasTrial?: number | null;
    trialImplicito?: boolean;
  };
  recursos_customizados?: Record<string, boolean> | null;
};

// Modal de Gerenciar Recursos (definido antes do componente principal)
const ModalGerenciarRecursos = ({ empresa, onClose, onSuccess }: { empresa: EmpresaDetalhes; onClose: () => void; onSuccess: () => void }) => {
  const [recursosCustomizados, setRecursosCustomizados] = useState<Partial<Record<PremiumModule, boolean>>>({});
  const [salvandoRecursos, setSalvandoRecursos] = useState(false);

  useEffect(() => {
    async function fetchRecursos() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
        const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresa.id}/recursos`, { cache: 'no-store', credentials: 'include' });
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
        credentials: 'include',
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
          Libere módulos premium manualmente para esta empresa. Por padrão, o acesso segue o plano da assinatura.
        </p>

        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Módulos Premium</h4>
          <PremiumRecursosForm
            valores={recursosCustomizados}
            onChange={setRecursosCustomizados}
            disabled={salvandoRecursos}
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-yellow-800">
            <strong>Nota:</strong> Para remover todas as customizações e voltar a usar apenas os recursos da assinatura, 
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

const ModalEditarDadosEmpresa = ({
  open,
  onClose,
  empresa,
  empresaId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  empresa: EmpresaDetalhes;
  empresaId: string;
  onSuccess: () => Promise<void>;
}) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    cnpj: '',
    cpf: '',
    telefone: '',
    endereco: '',
    cidade: '',
    website: '',
    logo_url: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: empresa.nome ?? '',
      email: empresa.email ?? '',
      cnpj: empresa.cnpj ?? '',
      cpf: empresa.cpf ?? '',
      telefone: empresa.telefone ?? '',
      endereco: empresa.endereco ?? '',
      cidade: empresa.cidade ?? '',
      website: empresa.website ?? '',
      logo_url: empresa.logo_url ?? '',
    });
  }, [open, empresa]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    if (!nome) {
      alert('Informe o nome da empresa.');
      return;
    }
    setSaving(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
      const trim = (s: string) => s.trim();
      const payload = {
        nome,
        email: trim(form.email),
        cnpj: trim(form.cnpj),
        cpf: trim(form.cpf),
        telefone: trim(form.telefone),
        endereco: trim(form.endereco),
        cidade: trim(form.cidade),
        website: trim(form.website),
        logo_url: trim(form.logo_url) || null,
      };
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao salvar');
      }
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-editar-empresa-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 id="modal-editar-empresa-titulo" className="text-lg font-semibold text-gray-900">
            Editar dados da empresa
          </h3>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={salvar} className="overflow-y-auto px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input
              className={inputClass}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
              <input className={inputClass} value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
              <input className={inputClass} value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
            <input className={inputClass} value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
            <textarea className={`${inputClass} min-h-[72px]`} value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
            <input className={inputClass} value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
            <input className={inputClass} value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL do logo</label>
            <input className={inputClass} value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} />
          </div>
          <p className="text-xs text-gray-500">
            Logo vazio remove a URL. Logos claro/escuro ficam em Configurações da empresa no app (se a migration existir na base).
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-300" disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
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
  const [planoInicialAlterar, setPlanoInicialAlterar] = useState<PlanoSlug | null>(null);
  const [showGerenciarRecursos, setShowGerenciarRecursos] = useState(false);
  const [showEditarDadosEmpresa, setShowEditarDadosEmpresa] = useState(false);
  const [salvandoAtivo, setSalvandoAtivo] = useState(false);
  const [salvandoLiberado, setSalvandoLiberado] = useState(false);
  const [cancelandoAssinatura, setCancelandoAssinatura] = useState(false);
  const [diasTrialInput, setDiasTrialInput] = useState(String(DIAS_TRIAL_GRATIS));
  const [contarTrialDe, setContarTrialDe] = useState<'hoje' | 'criacao'>('hoje');
  const [dataTrialFimInput, setDataTrialFimInput] = useState('');
  const [salvandoTrial, setSalvandoTrial] = useState(false);
  const [storageMb, setStorageMb] = useState<number | null>(null);
  const [carregandoStorage, setCarregandoStorage] = useState(false);
  const [aba, setAba] = useState<AbaEmpresa>('geral');
  const [showExcluirEmpresa, setShowExcluirEmpresa] = useState(false);
  const [excluirNomeConfirm, setExcluirNomeConfirm] = useState('');
  const [excluirFraseConfirm, setExcluirFraseConfirm] = useState('');
  const [excluindoEmpresa, setExcluindoEmpresa] = useState(false);
  const [erroExcluirEmpresa, setErroExcluirEmpresa] = useState<string | null>(null);
  const [empresaExcluida, setEmpresaExcluida] = useState(false);
  /** Evita reload/erro "Empresa não encontrada" após exclusão bem-sucedida. */
  const empresaExcluidaRef = useRef(false);

  // Função para recarregar dados da empresa (`silent` evita spinner em atualizações após modais)
  const recarregarEmpresa = async (opts?: { silent?: boolean }) => {
    if (!empresaId || empresaExcluidaRef.current) return;
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}`, { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (empresaExcluidaRef.current) return;
      if (!res.ok || !json.ok) {
        const msg = json.message || (typeof json.error === 'string' ? json.error : json.error?.message) || 'Falha ao carregar empresa';
        const notFound =
          res.status === 404 ||
          /não encontrada|nao encontrada|not found/i.test(String(msg));
        if (notFound) {
          router.replace('/admin-saas/empresas');
          return;
        }
        throw new Error(msg);
      }
      setEmpresa(json.empresa);
    } catch (e: any) {
      if (empresaExcluidaRef.current) return;
      console.error(e);
      if (!silent) setError(e.message || 'Não foi possível carregar os detalhes da empresa');
      else alert(e.message || 'Não foi possível atualizar os dados');
    } finally {
      if (!silent && !empresaExcluidaRef.current) setLoading(false);
    }
  };

  // Buscar detalhes da empresa
  useEffect(() => {
    if (!empresaId) return;
    recarregarEmpresa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId || loading || empresaExcluidaRef.current) return;
    let cancelled = false;
    setCarregandoStorage(true);
    setStorageMb(null);

    (async () => {
      try {
        const res = await fetch(`/api/admin-saas/empresas/${empresaId}/storage`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json();
        if (!cancelled && !empresaExcluidaRef.current && res.ok && json.ok) {
          setStorageMb(typeof json.usoMb === 'number' ? json.usoMb : 0);
        }
      } catch (e) {
        if (!empresaExcluidaRef.current) {
          console.error('Erro ao carregar storage:', e);
        }
      } finally {
        if (!cancelled) setCarregandoStorage(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [empresaId, loading]);

  useEffect(() => {
    if (!empresa) return;
    const dias =
      empresa.billing?.diasTrial ??
      empresa.dias_trial ??
      DIAS_TRIAL_GRATIS;
    setDiasTrialInput(String(dias));
    if (empresa.billing?.dataTrialFim) {
      const d = new Date(empresa.billing.dataTrialFim);
      if (!Number.isNaN(d.getTime())) {
        setDataTrialFimInput(d.toISOString().slice(0, 10));
      }
    }
  }, [empresa?.id, empresa?.billing?.diasTrial, empresa?.billing?.dataTrialFim, empresa?.dias_trial]);

  async function patchEmpresa(payload: Record<string, unknown>) {
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
    const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}`, {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error('Falha na atualização');
    // Recarregar dados
    const res2 = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}`, { cache: 'no-store', credentials: 'include' });
    const json2 = await res2.json();
    if (res2.ok && json2.ok) {
      setEmpresa(json2.empresa);
    }
  }

  async function handleToggleActive() {
    if (!empresa) return;
    setSalvandoAtivo(true);
    try {
      await patchEmpresa({ ativo: !empresa.ativo });
    } catch (e: any) {
      alert(e.message || 'Não foi possível atualizar. Tente novamente.');
    } finally {
      setSalvandoAtivo(false);
    }
  }

  async function handleToggleSistemaLiberado() {
    if (!empresa) return;
    setSalvandoLiberado(true);
    try {
      await patchEmpresa({ sistema_liberado: !empresa.sistema_liberado });
    } catch (e: any) {
      alert(e.message || 'Não foi possível atualizar a liberação.');
    } finally {
      setSalvandoLiberado(false);
    }
  }

  async function handleApprove() {
    await patchEmpresa({ status: 'aprovada', ativo: true });
  }

  async function handleReject() {
    await patchEmpresa({ status: 'reprovada', ativo: false });
  }

  async function salvarPrazoTrial() {
    if (!empresa) return;

    const payload: Record<string, unknown> = {
      contar_de: contarTrialDe,
    };

    if (dataTrialFimInput.trim()) {
      payload.data_trial_fim = `${dataTrialFimInput.trim()}T23:59:59.999Z`;
    } else {
      const dias = parseInt(diasTrialInput, 10);
      if (!Number.isFinite(dias) || dias < 1 || dias > 365) {
        alert('Informe entre 1 e 365 dias de teste, ou escolha uma data de término.');
        return;
      }
      payload.dias_trial = dias;
    }

    const msg =
      empresa.billing?.assinaturaStatus === 'active' || empresa.billing?.assinaturaStatus === 'ativa'
        ? 'Esta empresa tem assinatura ativa. Definir trial vai alterar o status para período de teste. Continuar?'
        : null;
    if (msg && !window.confirm(msg)) return;

    setSalvandoTrial(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}/trial`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao salvar prazo de teste');
      }
      alert(json.message || 'Prazo de teste atualizado.');
      await recarregarEmpresa({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar prazo de teste');
    } finally {
      setSalvandoTrial(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (empresaExcluida) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-64 text-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        <p className="text-sm">Empresa excluída. Redirecionando…</p>
      </div>
    );
  }

  if (error || !empresa) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Empresa não encontrada'}
        </div>
        <Button onClick={() => router.push('/admin-saas/empresas')}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const cobrancaBadgeClass =
    empresa.billing?.cobrancaStatus === 'Sistema liberado'
      ? 'bg-sky-100 text-sky-800'
      : empresa.billing?.cobrancaStatus === 'Em dia'
        ? 'bg-green-100 text-green-800'
        : empresa.billing?.cobrancaStatus === 'Trial'
          ? 'bg-yellow-100 text-yellow-800'
          : empresa.billing?.cobrancaStatus === 'Trial encerrado'
            ? 'bg-amber-100 text-amber-900'
            : empresa.billing?.cobrancaStatus === 'Vencido'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 min-w-0">
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
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            onClick={handleToggleSistemaLiberado}
            disabled={salvandoLiberado || !empresa.ativo}
            title={
              !empresa.ativo
                ? 'Ative a empresa antes de liberar o sistema'
                : empresa.sistema_liberado
                  ? 'Remove acesso sem assinatura paga'
                  : 'Permite usar o sistema mesmo sem assinatura/trial válido'
            }
            className={
              empresa.sistema_liberado
                ? 'border-sky-300 text-sky-800 hover:bg-sky-50'
                : 'border-amber-300 text-amber-800 hover:bg-amber-50'
            }
          >
            {empresa.sistema_liberado ? (
              <>
                <FiSlash className="mr-2" />
                {salvandoLiberado ? 'Revogando...' : 'Revogar liberação'}
              </>
            ) : (
              <>
                <FiCheck className="mr-2" />
                {salvandoLiberado ? 'Liberando...' : 'Liberar sistema'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleActive}
            disabled={salvandoAtivo}
            className={empresa.ativo ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}
          >
            {empresa.ativo ? (
              <>
                <FiToggleRight className="mr-2" />
                {salvandoAtivo ? 'Desativando...' : 'Desativar'}
              </>
            ) : (
              <>
                <FiToggleLeft className="mr-2" />
                {salvandoAtivo ? 'Ativando...' : 'Ativar'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1" aria-label="Abas da empresa">
          <button
            type="button"
            onClick={() => setAba('geral')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aba === 'geral'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Visão geral
          </button>
          <button
            type="button"
            onClick={() => setAba('pagamentos')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aba === 'pagamentos'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FiCreditCard className="w-4 h-4" />
            Pagamentos
          </button>
        </nav>
      </div>

      {aba === 'pagamentos' ? (
        <AdminEmpresaPagamentosSection empresaId={empresaId} />
      ) : (
      <>

      {/* Resumo rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FiBuilding className="text-blue-600 w-5 h-5" />
            </div>
            {empresa.status && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  empresa.status === 'aprovada'
                    ? 'bg-green-100 text-green-800'
                    : empresa.status === 'pendente'
                      ? 'bg-yellow-100 text-yellow-800'
                      : empresa.status === 'reprovada'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                }`}
              >
                {empresa.status}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500">Status</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{empresa.ativo ? 'Ativa' : 'Inativa'}</p>
          {empresa.sistema_liberado && (
            <p className="mt-2 text-xs text-sky-700 font-medium">Sistema liberado</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <FiDollarSign className="text-purple-600 w-5 h-5" />
            </div>
            {empresa.billing?.cobrancaStatus && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cobrancaBadgeClass}`}>
                {empresa.billing.cobrancaStatus}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500">Assinatura</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">
            {empresa.billing?.plano?.nome || 'Sem plano'}
          </p>
          {empresa.billing?.valorMensal != null && Number.isFinite(Number(empresa.billing.valorMensal)) && (
            <p className="mt-2 text-sm text-gray-600">
              {Number(empresa.billing.valorMensal).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
              <span className="text-gray-400"> /mês</span>
              {empresa.billing.precoCatalogo != null &&
                Math.abs(Number(empresa.billing.valorMensal) - Number(empresa.billing.precoCatalogo)) >
                  0.009 && (
                  <span className="block text-xs text-emerald-700 mt-0.5 font-medium">
                    Personalizado (catálogo{' '}
                    {Number(empresa.billing.precoCatalogo).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                    )
                  </span>
                )}
            </p>
          )}
          {empresa.billing?.dataTrialFim &&
            (empresa.billing.cobrancaStatus === 'Trial' ||
              empresa.billing.cobrancaStatus === 'Trial encerrado') && (
            <p className="mt-2 text-xs text-gray-600">
              Teste até {formatarDataCurta(empresa.billing.dataTrialFim)}
              {empresa.billing.cobrancaStatus === 'Trial' && empresa.billing.diasTrialRestantes != null && (
                <> · {empresa.billing.diasTrialRestantes}d rest.</>
              )}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <FiUsers className="text-green-600 w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Usuários</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{empresa.metrics?.usuarios ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
            <FiFileText className="text-orange-600 w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Ordens de Serviço</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{empresa.metrics?.ordens ?? 0}</p>
        </div>
      </div>

      {/* Gestão de assinatura e trial */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Assinatura e período de teste</h2>
        <p className="text-sm text-gray-500 mb-6">
          Ajuste valor cobrado e prazo de teste sem sair desta página.
        </p>

        <div className="space-y-6">
          {empresa.billing?.dataTrialFim &&
            (empresa.billing.cobrancaStatus === 'Trial' ||
              empresa.billing.cobrancaStatus === 'Trial encerrado') && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 space-y-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Fim do período de teste</span>
                {empresa.billing.diasTrial != null ? (
                  <span className="text-gray-500"> ({empresa.billing.diasTrial} dias)</span>
                ) : (
                  <span className="text-gray-500"> (padrão {DIAS_TRIAL_GRATIS} dias)</span>
                )}
                : {formatarDataCurta(empresa.billing.dataTrialFim)}
              </p>
              {empresa.billing.cobrancaStatus === 'Trial' && empresa.billing.diasTrialRestantes != null && (
                <p className="text-sm text-gray-600">
                  Restam <span className="font-semibold text-gray-900">{empresa.billing.diasTrialRestantes}</span> dia
                  {empresa.billing.diasTrialRestantes === 1 ? '' : 's'} (dias corridos, igual ao app).
                </p>
              )}
              {empresa.billing.trialImplicito && (
                <p className="text-xs text-amber-800">
                  Trial implícito: sem linha em assinaturas; o prazo segue a data de criação da empresa.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <AdminEmpresaValorPorPlano
              empresaId={empresaId}
              planoAtualSlug={empresa.billing?.plano?.slug}
              planoAtualNome={empresa.billing?.plano?.nome}
              valorMensalAtual={empresa.billing?.valorMensal}
              precoCatalogoAtual={empresa.billing?.precoCatalogo}
              assinaturaStatus={empresa.billing?.assinaturaStatus}
              onSaved={() => recarregarEmpresa({ silent: true })}
              onAlterarAssinatura={(slug) => {
                setPlanoInicialAlterar(slug ?? null);
                setShowAlterarPlano(true);
              }}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Configurar prazo de teste</h3>
              <div className="flex flex-wrap gap-2">
                {PRESETS_DIAS_TRIAL.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDiasTrialInput(String(d));
                      setDataTrialFimInput('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      diasTrialInput === String(d) && !dataTrialFimInput
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dias-trial-custom" className="block text-xs font-medium text-gray-600 mb-1">
                    Dias personalizados
                  </label>
                  <input
                    id="dias-trial-custom"
                    type="number"
                    min={1}
                    max={365}
                    value={diasTrialInput}
                    onChange={(e) => {
                      setDiasTrialInput(e.target.value);
                      setDataTrialFimInput('');
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="data-trial-fim" className="block text-xs font-medium text-gray-600 mb-1">
                    Ou data de término
                  </label>
                  <input
                    id="data-trial-fim"
                    type="date"
                    value={dataTrialFimInput}
                    onChange={(e) => setDataTrialFimInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-gray-600 mb-1">Contar prazo a partir de</legend>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="contar-trial"
                    checked={contarTrialDe === 'hoje'}
                    onChange={() => setContarTrialDe('hoje')}
                    className="text-indigo-600"
                  />
                  Hoje (estender ou reiniciar teste)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="contar-trial"
                    checked={contarTrialDe === 'criacao'}
                    onChange={() => setContarTrialDe('criacao')}
                    className="text-indigo-600"
                  />
                  Criação da empresa
                </label>
              </fieldset>
              <Button
                type="button"
                size="sm"
                disabled={salvandoTrial}
                onClick={salvarPrazoTrial}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {salvandoTrial ? 'Salvando...' : 'Salvar prazo de teste'}
              </Button>
              <p className="text-xs text-gray-500 leading-relaxed">
                Atualiza o prazo de teste da empresa. Use &quot;a partir de hoje&quot; para estender testes expirados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seções de Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações da Empresa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Informações da Empresa</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-gray-300 shrink-0"
              onClick={() => setShowEditarDadosEmpresa(true)}
            >
              <FiEdit2 className="mr-1.5 w-4 h-4" />
              Editar
            </Button>
          </div>
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
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">CPF</div>
              <div className={`text-sm ${empresa.cpf ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.cpf || 'Não informado'}
              </div>
            </div>
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
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Cidade</div>
              <div className={`text-sm ${empresa.cidade ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.cidade || 'Não informado'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Website</div>
              <div className={`text-sm ${empresa.website ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {empresa.website ? (
                  <a href={empresa.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {empresa.website}
                  </a>
                ) : (
                  'Não informado'
                )}
              </div>
            </div>
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
              <span className="text-sm font-semibold text-gray-900">
                {carregandoStorage ? '…' : (storageMb ?? empresa.metrics?.usoMb ?? 0)}
              </span>
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

      <AdminEmpresaUsuariosSection empresaId={empresaId} empresaNome={empresa.nome} />

      <AdminEmpresaClientesSection empresaId={empresaId} />

      {/* Ações Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setPlanoInicialAlterar(null);
              setShowAlterarPlano(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FiDollarSign className="mr-2" />
            Alterar Assinatura
          </Button>
          <Button
            onClick={() => setShowGerenciarRecursos(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <FiToggleRight className="mr-2" />
            Gerenciar Recursos
          </Button>
          {empresa.billing?.assinaturaStatus === 'active' || empresa.billing?.assinaturaStatus === 'trial' ? (
            <Button
              onClick={async () => {
                if (!confirm('Tem certeza que deseja cancelar a assinatura desta empresa? O usuário deixará de ter acesso ao sistema ao vencer o período atual.')) return;
                setCancelandoAssinatura(true);
                try {
                  const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
                  const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaId}/cancelar-assinatura`, {
                    method: 'POST',
                    credentials: 'include',
                  });
                  const json = await res.json();
                  if (!res.ok || !json.ok) {
                    throw new Error(json.message || 'Falha ao cancelar assinatura');
                  }
                  await recarregarEmpresa();
                } catch (e: any) {
                  alert(e.message || 'Erro ao cancelar assinatura');
                } finally {
                  setCancelandoAssinatura(false);
                }
              }}
              disabled={cancelandoAssinatura}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              <FiSlash className="mr-2" />
              {cancelandoAssinatura ? 'Cancelando...' : 'Cancelar assinatura'}
            </Button>
          ) : empresa.billing?.assinaturaStatus === 'cancelled' ? (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm">
              <FiSlash className="text-gray-500" />
              Assinatura cancelada
            </span>
          ) : null}
        </div>
      </div>

      {/* Zona de perigo — exclusão permanente */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 rounded-lg bg-red-50 p-2 text-red-600">
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-900">Zona de perigo</h2>
            <p className="text-sm text-red-700/90 mt-1 max-w-2xl">
              Excluir esta empresa remove de forma permanente usuários, clientes, ordens de serviço,
              produtos, pagamentos, arquivos no storage e demais dados vinculados. Esta ação não pode ser desfeita.
              Prefira <strong>Desativar</strong> se quiser apenas bloquear o acesso.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setErroExcluirEmpresa(null);
            setExcluirNomeConfirm('');
            setExcluirFraseConfirm('');
            setShowExcluirEmpresa(true);
          }}
          className="bg-red-700 hover:bg-red-800 text-white"
        >
          <FiTrash2 className="mr-2" />
          Excluir empresa permanentemente
        </Button>
      </div>

      </>
      )}

      {/* Modais */}
      {showAlterarPlano && empresa ? (
        <AdminAlterarPlanoModal
          empresaId={empresa.id}
          empresaNome={empresa.nome}
          planoAtualId={empresa.billing?.plano?.id}
          planoAtualNome={empresa.billing?.plano?.nome}
          planoInicialSlug={planoInicialAlterar}
          valorMensalAtual={empresa.billing?.valorMensal}
          onClose={() => {
            setShowAlterarPlano(false);
            setPlanoInicialAlterar(null);
          }}
          onSuccess={async () => {
            setShowAlterarPlano(false);
            setPlanoInicialAlterar(null);
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

      {showEditarDadosEmpresa && empresa ? (
        <ModalEditarDadosEmpresa
          open={showEditarDadosEmpresa}
          onClose={() => setShowEditarDadosEmpresa(false)}
          empresa={empresa}
          empresaId={empresaId}
          onSuccess={() => recarregarEmpresa({ silent: true })}
        />
      ) : null}

      {showExcluirEmpresa && empresa ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            if (!excluindoEmpresa) setShowExcluirEmpresa(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-start gap-3">
              <FiAlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Excluir empresa permanentemente</h3>
                <p className="text-sm text-red-800 mt-1">
                  Você está prestes a apagar <strong>{empresa.nome}</strong> e todos os dados vinculados
                  (OS, clientes, usuários, storage, etc.). Irreversível.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Só a empresa selecionada será afetada. Confirme digitando o nome e a frase de segurança.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digite o nome da empresa: <span className="font-semibold text-gray-900">{empresa.nome}</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  value={excluirNomeConfirm}
                  onChange={(e) => setExcluirNomeConfirm(e.target.value)}
                  placeholder={empresa.nome}
                  disabled={excluindoEmpresa}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digite <span className="font-mono font-semibold text-red-700">{EXCLUIR_EMPRESA_FRASE}</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  value={excluirFraseConfirm}
                  onChange={(e) => setExcluirFraseConfirm(e.target.value)}
                  placeholder={EXCLUIR_EMPRESA_FRASE}
                  disabled={excluindoEmpresa}
                  autoComplete="off"
                />
              </div>

              {erroExcluirEmpresa && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {erroExcluirEmpresa}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  disabled={excluindoEmpresa}
                  onClick={() => setShowExcluirEmpresa(false)}
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={
                    excluindoEmpresa ||
                    excluirNomeConfirm.trim() !== empresa.nome.trim() ||
                    excluirFraseConfirm.trim() !== EXCLUIR_EMPRESA_FRASE
                  }
                  className="bg-red-700 hover:bg-red-800 text-white disabled:opacity-40"
                  onClick={async () => {
                    if (!empresa) return;
                    setErroExcluirEmpresa(null);
                    setExcluindoEmpresa(true);
                    try {
                      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/excluir`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          confirmacaoNome: excluirNomeConfirm,
                          confirmacaoTexto: excluirFraseConfirm,
                        }),
                      });
                      const json = await res.json();
                      if (!res.ok || !json.ok) {
                        throw new Error(json.message || 'Falha ao excluir empresa');
                      }
                      // Marca antes de qualquer re-render/reload para não tratar 404 como erro
                      empresaExcluidaRef.current = true;
                      setEmpresaExcluida(true);
                      setShowExcluirEmpresa(false);
                      setEmpresa(null);
                      setError(null);
                      router.replace('/admin-saas/empresas');
                    } catch (e: unknown) {
                      if (!empresaExcluidaRef.current) {
                        setErroExcluirEmpresa(
                          e instanceof Error ? e.message : 'Erro ao excluir empresa'
                        );
                      }
                    } finally {
                      if (!empresaExcluidaRef.current) {
                        setExcluindoEmpresa(false);
                      }
                    }
                  }}
                >
                  <FiTrash2 className="mr-2" />
                  {excluindoEmpresa ? 'Excluindo… isso pode demorar' : 'Confirmar exclusão permanente'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
