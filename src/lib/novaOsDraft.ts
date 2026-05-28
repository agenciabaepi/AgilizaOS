import type { AparelhoSelecionado } from '@/types/aparelhos';
import type { TipoEquipamentoSelecionado } from '@/types/equipamentos';

export const NOVA_OS_DRAFT_VERSION = 1;

export interface NovaOSDraftProdutoServico {
  id: string;
  nome: string;
  tipo: string;
  preco: number;
  unidade: string;
  ativo?: boolean;
  codigo?: string;
}

export interface NovaOSDraftOsGarantia {
  id: string;
  numero_os?: number | string;
  marca?: string;
  modelo?: string;
  cor?: string;
  numero_serie?: string;
  cliente_id?: string;
}

export interface NovaOSDraftData {
  version: number;
  updatedAt: string;
  etapaAtual: number;
  tipoEntrada: 'nova' | 'garantia';
  osGarantiaBusca: string;
  osGarantiaSelecionada: NovaOSDraftOsGarantia | null;
  clienteSelecionado: string | null;
  dadosEquipamento: {
    tipo: string;
    marca: string;
    modelo: string;
    cor: string;
    numero_serie: string;
    descricao_problema: string;
    senha: string;
    senha_padrao: number[];
  };
  tipoEquipamentoSelecionado: TipoEquipamentoSelecionado | null;
  aparelhoSelecionado: AparelhoSelecionado | null;
  identificacaoManual: boolean;
  previewCor: {
    frente: string | null;
    verso: string | null;
    corId: string | null;
  };
  checklistEntrada: Record<string, boolean>;
  acessorios: string;
  tecnicoResponsavel: string | null;
  statusSelecionado: string | null;
  produtosSelecionados: NovaOSDraftProdutoServico[];
  servicosSelecionados: NovaOSDraftProdutoServico[];
  termoSelecionado: string | null;
  prazoEntrega: string;
  observacoes: string;
  condicoesEquipamento: string;
}

function draftStorageKey(empresaId: string, usuarioAuthId?: string | null): string {
  const userPart = usuarioAuthId?.trim() || 'anon';
  return `nova_os_draft_${empresaId}_${userPart}`;
}

export function loadNovaOsDraft(
  empresaId: string | undefined,
  usuarioAuthId?: string | null
): NovaOSDraftData | null {
  if (typeof window === 'undefined' || !empresaId) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(empresaId, usuarioAuthId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NovaOSDraftData;
    if (parsed.version !== NOVA_OS_DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveNovaOsDraft(
  empresaId: string,
  usuarioAuthId: string | null | undefined,
  data: Omit<NovaOSDraftData, 'version' | 'updatedAt'>
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: NovaOSDraftData = {
      ...data,
      version: NOVA_OS_DRAFT_VERSION,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftStorageKey(empresaId, usuarioAuthId), JSON.stringify(payload));
  } catch {
    // quota exceeded or private mode
  }
}

export function clearNovaOsDraft(
  empresaId: string | undefined,
  usuarioAuthId?: string | null
): void {
  if (typeof window === 'undefined' || !empresaId) return;
  try {
    localStorage.removeItem(draftStorageKey(empresaId, usuarioAuthId));
  } catch {
    // ignore
  }
}

export function isDraftMeaningful(draft: NovaOSDraftData): boolean {
  if (draft.clienteSelecionado) return true;
  if (draft.tipoEntrada === 'garantia' && draft.osGarantiaSelecionada?.id) return true;
  if (draft.dadosEquipamento.marca || draft.dadosEquipamento.modelo) return true;
  if (draft.dadosEquipamento.descricao_problema?.trim()) return true;
  if (draft.dadosEquipamento.numero_serie?.trim()) return true;
  if (draft.acessorios?.trim()) return true;
  if (draft.observacoes?.trim() || draft.condicoesEquipamento?.trim()) return true;
  if (Object.values(draft.checklistEntrada).some(Boolean)) return true;
  if (draft.produtosSelecionados.length > 0 || draft.servicosSelecionados.length > 0) return true;
  if (draft.etapaAtual > 1) return true;
  return false;
}

export function formatDraftUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
