'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiShieldOff,
  FiLock,
  FiPackage,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiImage,
  FiFileText,
  FiCalendar,
  FiSmartphone,
  FiMessageCircle,
  FiDollarSign,
} from 'react-icons/fi';
import ChecklistPublic from '@/components/ChecklistPublic';
import LaudoRenderer from '@/components/LaudoRenderer';
import { getStatusTecnicoLabel } from '@/utils/statusLabels';

const STORAGE_KEY = 'os_senha_';

interface DadosOS {
  id: string;
  numero_os?: string | number;
  equipamento?: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  numero_serie?: string;
  acessorios?: string;
  condicoes_equipamento?: string;
  status_atual?: string;
  status_tecnico?: string;
  created_at?: string;
  prazo_entrega?: string;
  data_entrega?: string;
  problema_relatado?: string;
  servico?: string;
  observacao?: string;
  checklist_entrada?: string | null;
  laudo?: string | null;
  imagens?: string | null;
  imagens_tecnico?: string | null;
  empresa_id?: string;
  empresa_nome?: string;
  cliente?: { nome?: string; telefone?: string; email?: string; endereco?: string } | null;
  termo_garantia?: { nome?: string; conteudo?: string } | null;
  peca?: string;
  qtd_servico?: number;
  qtd_peca?: number;
  valor_servico?: number;
  valor_peca?: number;
  desconto?: number;
  valor_faturado?: number;
}

export default function OSStatusPublicoPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [step, setStep] = useState<'check' | 'form' | 'content' | 'notfound' | 'disabled'>('check');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dados, setDados] = useState<DadosOS | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setStep('notfound');
      return;
    }
    (async () => {
      setStep('check');
      setErro('');
      try {
        const res = await fetch(`/api/os-public/${encodeURIComponent(id)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || json.notFound) {
          setStep('notfound');
          return;
        }
        if (json.desativado) {
          setStep('disabled');
          return;
        }

        const senhaSalva = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY + id) : null;
        if (senhaSalva) {
          const resDados = await fetch(`/api/os-public/${encodeURIComponent(id)}/dados`, {
            cache: 'no-store',
            headers: { Accept: 'application/json', 'X-Senha-OS': senhaSalva },
          });
          if (resDados.ok) {
            const dadosJson = await resDados.json();
            setDados(dadosJson);
            setStep('content');
            return;
          }
          if (typeof window !== 'undefined') sessionStorage.removeItem(STORAGE_KEY + id);
        }
        setStep('form');
      } catch {
        setStep('notfound');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!senha.trim()) {
      setErro('Informe a senha do recibo.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/os-public/${encodeURIComponent(id)}/validar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senha.trim() }),
      });
      const json = await res.json().catch(() => ({}));

      if (json.ok) {
        if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY + id, senha.trim());
        const resDados = await fetch(`/api/os-public/${encodeURIComponent(id)}/dados`, {
          cache: 'no-store',
          headers: { Accept: 'application/json', 'X-Senha-OS': senha.trim() },
        });
        if (resDados.ok) {
          const dadosJson = await resDados.json();
          setDados(dadosJson);
          setStep('content');
          return;
        }
      }
      setErro(json.error || 'Senha incorreta. Verifique o recibo.');
    } catch {
      setErro('Erro ao validar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (s?: string | null) => {
    if (!s) return '—';
    try {
      const d = new Date(s);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return String(s);
    }
  };

  const formatCurrency = (v?: number | null) => {
    if (v == null || Number.isNaN(v)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const imageUrls = (dados?.imagens ?? '')
    .toString()
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const imageTecnicoUrls = (dados?.imagens_tecnico ?? '')
    .toString()
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const allImageUrls = [...imageUrls, ...imageTecnicoUrls];
  const lightboxIndex = lightboxUrl ? allImageUrls.indexOf(lightboxUrl) : -1;
  const hasPrev = lightboxIndex > 0;
  const hasNext = lightboxIndex >= 0 && lightboxIndex < allImageUrls.length - 1;

  if (step === 'check') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (step === 'notfound') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">OS não encontrada</h1>
          <p className="text-gray-600">Verifique o número ou o link do QR Code.</p>
        </div>
      </div>
    );
  }

  if (step === 'disabled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <FiShieldOff className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Recurso desativado</h1>
          <p className="text-gray-600">O acompanhamento por link público está desativado para esta empresa.</p>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">
                Acompanhar OS
              </h1>
              <p className="text-gray-600 font-light">
                Informe a senha do recibo para acessar sua ordem de serviço
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  id="senha"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ex: 1234"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-900 shadow-sm transition-all duration-200 text-center text-lg tracking-widest"
                  disabled={submitting}
                />
              </div>
              {erro && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {erro}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {submitting ? 'Verificando...' : 'Acessar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step !== 'content' || !dados) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho no estilo do sistema (ordens) */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
          <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                OS #{dados.numero_os ?? id}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-0.5">
                {dados.empresa_nome && <span>{dados.empresa_nome}</span>}
                {dados.empresa_nome && dados.created_at && ' · '}
                {dados.created_at && `Criada em ${formatDate(dados.created_at)}`}
              </p>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Termo para o cliente — em destaque no topo */}
          {dados.termo_garantia?.conteudo && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex-shrink-0">
                  <FiFileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700 dark:text-amber-300" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">
                  {dados.termo_garantia.nome || 'Termo'}
                </h2>
              </div>
              <div
                className="prose prose-sm max-w-none text-gray-700 dark:text-zinc-300 prose-p:my-1 prose-ul:my-2 prose-li:my-0"
                dangerouslySetInnerHTML={{ __html: dados.termo_garantia.conteudo }}
              />
            </div>
          )}

          {/* Status atual - badge no estilo ordem */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                <FiClock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Status</h2>
            </div>
            <p className="font-medium text-gray-900 dark:text-zinc-100">
              {getStatusTecnicoLabel(dados.status_atual, dados.status_tecnico) || (dados.status_atual ?? '—')}
            </p>
          </div>

          {/* Datas */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
                <FiCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-300" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Datas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-zinc-400">Abertura</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100">{formatDate(dados.created_at)}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-zinc-400">Previsão de entrega</span>
                <p className="font-medium text-gray-900 dark:text-zinc-100">{formatDate(dados.prazo_entrega)}</p>
              </div>
              {dados.data_entrega && (
                <div>
                  <span className="text-gray-600 dark:text-zinc-400">Data de entrega</span>
                  <p className="font-medium text-gray-900 dark:text-zinc-100">{formatDate(dados.data_entrega)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cliente */}
          {dados.cliente && (dados.cliente.nome || dados.cliente.telefone || dados.cliente.endereco) && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                  <FiUser className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Cliente</h2>
              </div>
              <div className="space-y-3">
                {dados.cliente.nome && <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">{dados.cliente.nome}</p>}
                <div className="text-sm space-y-1">
                  {dados.cliente.telefone && <p><span className="text-gray-600 dark:text-zinc-400">Telefone:</span> <span className="font-medium text-gray-900 dark:text-zinc-100">{dados.cliente.telefone}</span></p>}
                  {dados.cliente.email && <p><span className="text-gray-600 dark:text-zinc-400">E-mail:</span> <span className="font-medium text-gray-900 dark:text-zinc-100">{dados.cliente.email}</span></p>}
                  {dados.cliente.endereco && <p><span className="text-gray-600 dark:text-zinc-400">Endereço:</span> <span className="font-medium text-gray-900 dark:text-zinc-100">{dados.cliente.endereco}</span></p>}
                </div>
              </div>
            </div>
          )}

          {/* Aparelho */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
                <FiSmartphone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-300" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Aparelho</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              {(dados.equipamento || dados.marca || dados.modelo) && (
                <div className="sm:col-span-2">
                  <span className="text-gray-600 dark:text-zinc-400">Equipamento</span>
                  <p className="font-medium text-gray-900 dark:text-zinc-100">{[dados.equipamento, dados.marca, dados.modelo].filter(Boolean).join(' · ') || '—'}</p>
                </div>
              )}
              {dados.cor && <div><span className="text-gray-600 dark:text-zinc-400">Cor</span><p className="font-medium text-gray-900 dark:text-zinc-100">{dados.cor}</p></div>}
              {dados.numero_serie && <div><span className="text-gray-600 dark:text-zinc-400">Nº de série</span><p className="font-medium text-gray-900 dark:text-zinc-100">{dados.numero_serie}</p></div>}
              {dados.acessorios && <div className="sm:col-span-2"><span className="text-gray-600 dark:text-zinc-400">Acessórios</span><p className="font-medium text-gray-900 dark:text-zinc-100">{dados.acessorios}</p></div>}
              {dados.condicoes_equipamento && <div className="sm:col-span-2"><span className="text-gray-600 dark:text-zinc-400">Condições do equipamento</span><p className="font-medium text-gray-900 dark:text-zinc-100">{dados.condicoes_equipamento}</p></div>}
            </div>
          </div>

          {/* Relato */}
          {dados.problema_relatado && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex-shrink-0">
                  <FiMessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Relato do cliente</h2>
              </div>
              <p className="text-gray-900 dark:text-zinc-100 text-sm whitespace-pre-wrap">{dados.problema_relatado}</p>
            </div>
          )}

          {/* Serviço / Observação */}
          {/* Checklist */}
          {dados.checklist_entrada && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
                  <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-300" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Checklist de entrada</h2>
                  {dados.equipamento && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-full text-xs font-medium mt-1 inline-block">Categoria: {dados.equipamento}</span>}
                </div>
              </div>
              <ChecklistPublic checklistData={dados.checklist_entrada} empresaId={dados.empresa_id} equipamentoCategoria={dados.equipamento} />
            </div>
          )}

          {/* Imagens de entrada */}
          {imageUrls.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 bg-gray-100 dark:bg-zinc-600 rounded-lg flex-shrink-0">
                  <FiImage className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-zinc-300" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Imagens de entrada</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxUrl(url)}
                    className="block w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-600 aspect-square bg-gray-50 dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ——— Separação: Laudo e orçamento (parte do técnico) ——— */}
          {(dados.laudo || imageTecnicoUrls.length > 0 || dados.servico || dados.peca || (dados.valor_servico != null && dados.valor_servico > 0) || (dados.valor_peca != null && dados.valor_peca > 0) || (dados.valor_faturado != null && dados.valor_faturado > 0)) && (
            <>
              <div className="flex items-center gap-3 py-4">
                <div className="flex-1 h-px bg-gray-300 dark:bg-zinc-600" />
                <span className="text-sm font-medium text-gray-500 dark:text-zinc-400 px-2">Laudo e orçamento</span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-zinc-600" />
              </div>

              <div className="rounded-2xl border-2 border-gray-200 dark:border-zinc-600 bg-gray-50/80 dark:bg-zinc-800/80 p-4 sm:p-6 space-y-4 sm:space-y-6">
                {dados.laudo && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                        <FiFileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Laudo técnico</h2>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <LaudoRenderer content={dados.laudo} />
                    </div>
                  </div>
                )}

                {/* Orçamento + Fotos do técnico */}
                {(imageTecnicoUrls.length > 0 || dados.servico || dados.peca || (dados.valor_servico != null && dados.valor_servico > 0) || (dados.valor_peca != null && dados.valor_peca > 0) || (dados.valor_faturado != null && dados.valor_faturado > 0)) && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-600 p-4 sm:p-6 space-y-6">
              <div className="flex items-center gap-2 sm:gap-3 pb-3 border-b border-gray-200 dark:border-zinc-600">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
                  <FiDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-300" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Orçamento e fotos do serviço</h2>
              </div>

              {/* Valores do orçamento */}
              {(dados.servico || dados.peca || (dados.valor_servico != null && Number(dados.valor_servico) > 0) || (dados.valor_peca != null && Number(dados.valor_peca) > 0) || (dados.valor_faturado != null && Number(dados.valor_faturado) > 0)) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">Valores</h3>
                  <div className="space-y-2 text-sm">
                    {dados.servico && (Number(dados.valor_servico) > 0 || dados.servico) && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-gray-700 dark:text-zinc-300">Serviço{dados.servico ? `: ${dados.servico}` : ''}</span>
                        <span className="font-medium text-gray-900 dark:text-zinc-100 shrink-0">
                          {Number(dados.qtd_servico || 1) > 1 ? `${dados.qtd_servico} × ${formatCurrency(dados.valor_servico)} = ${formatCurrency(Number(dados.valor_servico || 0) * Number(dados.qtd_servico || 1))}` : formatCurrency(dados.valor_servico)}
                        </span>
                      </div>
                    )}
                    {dados.peca && (Number(dados.valor_peca) > 0 || dados.peca) && (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-gray-700 dark:text-zinc-300">Peça{dados.peca ? `: ${dados.peca}` : ''}</span>
                        <span className="font-medium text-gray-900 dark:text-zinc-100 shrink-0">
                          {Number(dados.qtd_peca || 1) > 1 ? `${dados.qtd_peca} × ${formatCurrency(dados.valor_peca)} = ${formatCurrency(Number(dados.valor_peca || 0) * Number(dados.qtd_peca || 1))}` : formatCurrency(dados.valor_peca)}
                        </span>
                      </div>
                    )}
                    {(Number(dados.desconto || 0) > 0) && (
                      <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                        <span>Desconto</span>
                        <span>-{formatCurrency(dados.desconto)}</span>
                      </div>
                    )}
                    {(dados.valor_faturado != null && Number(dados.valor_faturado) > 0) && (
                      <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-zinc-700 font-semibold text-gray-900 dark:text-zinc-100">
                        <span>Total</span>
                        <span>{formatCurrency(dados.valor_faturado)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linha divisória + Fotos do técnico (anexo do serviço) */}
              {imageTecnicoUrls.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-zinc-600">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-400 mb-2">Fotos do serviço</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imageTecnicoUrls.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxUrl(url)}
                        className="block w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-600 aspect-square bg-gray-50 dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Lightbox para visualizar imagem */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar imagem"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {allImageUrls.length > 1 && (
            <>
              {hasPrev && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(allImageUrls[lightboxIndex - 1]!); }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Imagem anterior"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {hasNext && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(allImageUrls[lightboxIndex + 1]!); }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Próxima imagem"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </>
          )}
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
