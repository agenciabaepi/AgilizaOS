'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  FiShieldOff,
  FiLock,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiImage,
  FiFileText,
  FiCalendar,
  FiSmartphone,
  FiMessageCircle,
  FiDollarSign,
  FiAlertCircle,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import ChecklistPublic from '@/components/ChecklistPublic';
import LaudoRenderer from '@/components/LaudoRenderer';
import VideosOS from '@/components/VideosOS';
import { getStatusTecnicoLabel } from '@/utils/statusLabels';
import { useTheme } from '@/context/ThemeContext';

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
  videos_tecnico?: string | null;
  empresa_id?: string;
  empresa_nome?: string;
  cliente?: { nome?: string; telefone?: string; email?: string; endereco?: string } | null;
  termo_garantia?: { nome?: string; conteudo?: string } | null;
  checklist_itens?: Array<{
    id: string;
    nome: string;
    descricao?: string | null;
    categoria: string;
    ativo: boolean;
    ordem: number;
    obrigatorio: boolean;
  }>;
  peca?: string;
  qtd_servico?: number;
  qtd_peca?: number;
  valor_servico?: number;
  valor_peca?: number;
  desconto?: number;
  valor_faturado?: number;
}

type Step = 'check' | 'form' | 'content' | 'notfound' | 'disabled';

const iconTone: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300',
};

function getStatusBadgeClass(status?: string | null) {
  const normalized = String(status || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ');

  if (normalized.includes('SEM REPARO') || normalized.includes('CLIENTE RECUSOU')) {
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700';
  }
  if (normalized.includes('ENTREGUE') || normalized.includes('CONCLUIDO') || normalized.includes('REPARO CONCLUIDO')) {
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700';
  }
  if (normalized.includes('ORCAMENTO') || normalized.includes('AGUARDANDO')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-700';
  }
  if (normalized.includes('EM ANALISE')) {
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700';
  }
  if (normalized.includes('APROVADO') || normalized.includes('EM EXECUCAO') || normalized.includes('EM ATENDIMENTO')) {
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-600';
}

function SectionCard({
  title,
  icon,
  tone = 'blue',
  children,
  extra,
}: {
  title: string;
  icon: ReactNode;
  tone?: keyof typeof iconTone;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className={`p-2 rounded-lg flex-shrink-0 ${iconTone[tone]}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">{title}</h2>
          {extra}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value?: ReactNode; wide?: boolean }) {
  if (value == null || value === '') return null;
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <span className="text-gray-600 dark:text-zinc-300 text-sm">{label}</span>
      <p className="font-medium text-gray-900 dark:text-zinc-50 mt-0.5">{value}</p>
    </div>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-xl text-zinc-700 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
    </button>
  );
}

function PublicChrome({ children, compact }: { children: ReactNode; compact?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700">
        <div className={`max-w-5xl mx-auto px-4 ${compact ? 'py-3' : 'py-4'} flex items-center justify-between gap-3`}>
          <Image
            src={isDark ? '/assets/imagens/logobranco.png' : '/assets/imagens/logopreto.png'}
            alt="Consert"
            width={compact ? 110 : 130}
            height={compact ? 36 : 42}
            className="h-8 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-500 dark:text-zinc-400">
              Acompanhamento de OS
            </span>
            <ThemeToggleButton />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          <span>Powered by</span>
          <span className="font-semibold text-gray-900 dark:text-zinc-100">Consert</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D1FE6E]" aria-hidden />
        </div>
      </footer>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <PublicChrome>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-zinc-200">
            {icon}
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">{title}</h1>
          <p className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </PublicChrome>
  );
}

export default function OSStatusPublicoPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [step, setStep] = useState<Step>('check');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dados, setDados] = useState<DadosOS | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ numeroOs?: string | number; empresaNome?: string }>({});

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

        setMeta({
          numeroOs: json.numeroOs,
          empresaNome: json.empresaNome,
        });

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
  const videoTecnicoUrls = (dados?.videos_tecnico ?? '')
    .toString()
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const allImageUrls = [...imageUrls, ...imageTecnicoUrls];
  const lightboxIndex = lightboxUrl ? allImageUrls.indexOf(lightboxUrl) : -1;
  const hasPrev = lightboxIndex > 0;
  const hasNext = lightboxIndex >= 0 && lightboxIndex < allImageUrls.length - 1;

  const statusLabel = dados
    ? getStatusTecnicoLabel(dados.status_atual, dados.status_tecnico) || (dados.status_atual ?? '—')
    : '';

  const temOrcamento =
    !!dados &&
    !!(
      dados.laudo ||
      imageTecnicoUrls.length > 0 ||
      videoTecnicoUrls.length > 0 ||
      dados.servico ||
      dados.peca ||
      (dados.valor_servico != null && dados.valor_servico > 0) ||
      (dados.valor_peca != null && dados.valor_peca > 0) ||
      (dados.valor_faturado != null && dados.valor_faturado > 0)
    );

  if (step === 'check') {
    return (
      <PublicChrome>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-[#D1FE6E] animate-spin border-t-transparent" />
            </div>
            <p className="text-gray-600 dark:text-zinc-400 text-sm">Carregando acompanhamento...</p>
          </div>
        </div>
      </PublicChrome>
    );
  }

  if (step === 'notfound') {
    return (
      <EmptyState
        icon={<FiAlertCircle className="w-7 h-7" />}
        title="OS não encontrada"
        description="Verifique o número da ordem ou o link do QR Code impresso no recibo."
      />
    );
  }

  if (step === 'disabled') {
    return (
      <EmptyState
        icon={<FiShieldOff className="w-7 h-7 text-amber-600 dark:text-amber-400" />}
        title="Recurso desativado"
        description="O acompanhamento por link público está desativado para esta empresa."
      />
    );
  }

  if (step === 'form') {
    return (
      <PublicChrome>
        <div className="flex items-center justify-center px-4 py-10 sm:py-16">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-zinc-800 p-6 sm:p-8 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black dark:bg-zinc-100 text-[#D1FE6E] dark:text-zinc-900">
                  <FiLock className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                  Acompanhar OS
                  {meta.numeroOs != null && (
                    <span className="text-gray-400 dark:text-zinc-500 font-semibold"> #{meta.numeroOs}</span>
                  )}
                </h1>
                {meta.empresaNome && (
                  <p className="mt-2 text-sm font-medium text-gray-800 dark:text-zinc-200">{meta.empresaNome}</p>
                )}
                <p className="mt-2 text-gray-600 dark:text-zinc-400 text-sm">
                  Informe a senha do recibo para acessar o status da sua ordem de serviço.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                    Senha de acesso
                  </label>
                  <input
                    id="senha"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ex: 1234"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-gray-900 dark:focus:border-zinc-400 focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-zinc-400/20 transition text-center text-lg tracking-widest font-mono"
                    disabled={submitting}
                  />
                </div>
                {erro && (
                  <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                    <FiAlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
                >
                  {submitting ? 'Verificando...' : 'Acessar acompanhamento'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </PublicChrome>
    );
  }

  if (step !== 'content' || !dados) {
    return (
      <PublicChrome>
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600 dark:text-zinc-400 text-sm">Carregando...</p>
        </div>
      </PublicChrome>
    );
  }

  return (
    <PublicChrome compact>
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                Ordem de serviço
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-zinc-100">
                OS #{dados.numero_os ?? id}
              </h1>
              <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base mt-1">
                {dados.empresa_nome && (
                  <span className="font-medium text-gray-800 dark:text-zinc-200">{dados.empresa_nome}</span>
                )}
                {dados.empresa_nome && dados.created_at && ' · '}
                {dados.created_at && `Criada em ${formatDate(dados.created_at)}`}
              </p>
            </div>
            <span
              className={`inline-flex items-center self-start px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusBadgeClass(
                statusLabel || dados.status_atual
              )}`}
            >
              <FiCheckCircle className="w-4 h-4 mr-2" />
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {dados.termo_garantia?.conteudo && (
              <SectionCard
                title={dados.termo_garantia.nome || 'Termo'}
                icon={<FiFileText className="w-4 h-4 sm:w-5 sm:h-5" />}
                tone="amber"
              >
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-zinc-100 prose-p:my-1 prose-ul:my-2 prose-li:my-0"
                  dangerouslySetInnerHTML={{ __html: dados.termo_garantia.conteudo }}
                />
              </SectionCard>
            )}

            {dados.cliente && (dados.cliente.nome || dados.cliente.telefone || dados.cliente.endereco) && (
              <SectionCard title="Cliente" icon={<FiUser className="w-4 h-4 sm:w-5 sm:h-5" />} tone="blue">
                <div className="space-y-3">
                  {dados.cliente.nome && (
                    <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">{dados.cliente.nome}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <Field label="Telefone" value={dados.cliente.telefone} />
                    <Field label="E-mail" value={dados.cliente.email} />
                    <Field label="Endereço" value={dados.cliente.endereco} wide />
                  </div>
                </div>
              </SectionCard>
            )}

            <SectionCard title="Aparelho" icon={<FiSmartphone className="w-4 h-4 sm:w-5 sm:h-5" />} tone="green">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <Field
                  label="Equipamento"
                  value={[dados.equipamento, dados.marca, dados.modelo].filter(Boolean).join(' · ') || undefined}
                  wide
                />
                <Field label="Cor" value={dados.cor} />
                <Field label="Nº de série" value={dados.numero_serie} />
                <Field label="Acessórios" value={dados.acessorios} wide />
                <Field label="Condições do equipamento" value={dados.condicoes_equipamento} wide />
              </div>
            </SectionCard>

            {dados.problema_relatado && (
              <SectionCard
                title="Relato do cliente"
                icon={<FiMessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                tone="purple"
              >
                <p className="text-gray-900 dark:text-zinc-50 text-sm whitespace-pre-wrap leading-relaxed">
                  {dados.problema_relatado}
                </p>
              </SectionCard>
            )}

            {dados.checklist_entrada && (
              <SectionCard
                title="Checklist de entrada"
                icon={<FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                tone="green"
                extra={
                  dados.equipamento ? (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-full text-xs font-medium">
                      Categoria: {dados.equipamento}
                    </span>
                  ) : undefined
                }
              >
                <ChecklistPublic
                  checklistData={dados.checklist_entrada}
                  empresaId={dados.empresa_id}
                  equipamentoCategoria={dados.equipamento}
                  catalogItens={dados.checklist_itens}
                />
              </SectionCard>
            )}

            {imageUrls.length > 0 && (
              <SectionCard title="Imagens de entrada" icon={<FiImage className="w-4 h-4 sm:w-5 sm:h-5" />} tone="gray">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imageUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxUrl(url)}
                      className="block w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-600 aspect-square bg-gray-50 dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-300 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                    </button>
                  ))}
                </div>
              </SectionCard>
            )}

            {temOrcamento && (
              <>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-300 px-1">
                    Laudo e orçamento
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-600" />
                </div>

                {dados.laudo && (
                  <SectionCard title="Laudo técnico" icon={<FiFileText className="w-4 h-4 sm:w-5 sm:h-5" />} tone="blue">
                    <LaudoRenderer content={dados.laudo} />
                  </SectionCard>
                )}

                {(imageTecnicoUrls.length > 0 ||
                  videoTecnicoUrls.length > 0 ||
                  dados.servico ||
                  dados.peca ||
                  (dados.valor_servico != null && Number(dados.valor_servico) > 0) ||
                  (dados.valor_peca != null && Number(dados.valor_peca) > 0) ||
                  (dados.valor_faturado != null && Number(dados.valor_faturado) > 0)) && (
                  <SectionCard
                    title={
                      videoTecnicoUrls.length > 0
                        ? 'Orçamento, fotos e vídeos do serviço'
                        : 'Orçamento e fotos do serviço'
                    }
                    icon={<FiDollarSign className="w-4 h-4 sm:w-5 sm:h-5" />}
                    tone="green"
                  >
                    <div className="space-y-6">
                      {(dados.servico ||
                        dados.peca ||
                        (dados.valor_servico != null && Number(dados.valor_servico) > 0) ||
                        (dados.valor_peca != null && Number(dados.valor_peca) > 0) ||
                        (dados.valor_faturado != null && Number(dados.valor_faturado) > 0)) && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-300 mb-2">Valores</h3>
                          <div className="space-y-2 text-sm rounded-lg border border-gray-100 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-900/70 p-3">
                            {dados.servico && (Number(dados.valor_servico) > 0 || dados.servico) && (
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-gray-700 dark:text-zinc-200">
                                  Serviço{dados.servico ? `: ${dados.servico}` : ''}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-zinc-50 shrink-0">
                                  {Number(dados.qtd_servico || 1) > 1
                                    ? `${dados.qtd_servico} × ${formatCurrency(dados.valor_servico)} = ${formatCurrency(Number(dados.valor_servico || 0) * Number(dados.qtd_servico || 1))}`
                                    : formatCurrency(dados.valor_servico)}
                                </span>
                              </div>
                            )}
                            {dados.peca && (Number(dados.valor_peca) > 0 || dados.peca) && (
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-gray-700 dark:text-zinc-200">
                                  Peça{dados.peca ? `: ${dados.peca}` : ''}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-zinc-50 shrink-0">
                                  {Number(dados.qtd_peca || 1) > 1
                                    ? `${dados.qtd_peca} × ${formatCurrency(dados.valor_peca)} = ${formatCurrency(Number(dados.valor_peca || 0) * Number(dados.qtd_peca || 1))}`
                                    : formatCurrency(dados.valor_peca)}
                                </span>
                              </div>
                            )}
                            {Number(dados.desconto || 0) > 0 && (
                              <div className="flex justify-between text-gray-600 dark:text-zinc-300">
                                <span>Desconto</span>
                                <span>-{formatCurrency(dados.desconto)}</span>
                              </div>
                            )}
                            {dados.valor_faturado != null && Number(dados.valor_faturado) > 0 && (
                              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-zinc-600 font-semibold text-gray-900 dark:text-zinc-50">
                                <span>Total</span>
                                <span>{formatCurrency(dados.valor_faturado)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {imageTecnicoUrls.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-300 mb-2">Fotos do serviço</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {imageTecnicoUrls.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setLightboxUrl(url)}
                                className="block w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-600 aspect-square bg-gray-50 dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-300 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
                              >
                                <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {videoTecnicoUrls.length > 0 && (
                        <VideosOS
                          videos={dados.videos_tecnico || ''}
                          ordemId={String(dados.numero_os ?? dados.id)}
                          titulo="Vídeos do serviço"
                        />
                      )}
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>

          <aside className="space-y-4 sm:space-y-6 lg:sticky lg:top-6 lg:self-start">
            <SectionCard title="Status" icon={<FiClock className="w-4 h-4 sm:w-5 sm:h-5" />} tone="blue">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusBadgeClass(
                  statusLabel || dados.status_atual
                )}`}
              >
                {statusLabel}
              </span>
            </SectionCard>

            <SectionCard title="Datas" icon={<FiCalendar className="w-4 h-4 sm:w-5 sm:h-5" />} tone="green">
              <div className="space-y-3 text-sm">
                <Field label="Abertura" value={formatDate(dados.created_at)} />
                <Field label="Previsão de entrega" value={formatDate(dados.prazo_entrega)} />
                {dados.data_entrega && <Field label="Data de entrega" value={formatDate(dados.data_entrega)} />}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>

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
            <FiX className="w-6 h-6" />
          </button>
          {allImageUrls.length > 1 && (
            <>
              {hasPrev && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxUrl(allImageUrls[lightboxIndex - 1]!);
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Imagem anterior"
                >
                  <FiChevronLeft className="w-6 h-6" />
                </button>
              )}
              {hasNext && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxUrl(allImageUrls[lightboxIndex + 1]!);
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Próxima imagem"
                >
                  <FiChevronRight className="w-6 h-6" />
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
    </PublicChrome>
  );
}
