import type { SupabaseClient } from '@supabase/supabase-js';

export type StatusTipo = 'os' | 'tecnico';
export type StatusOrigem = 'fixo' | 'personalizado';

export interface StatusEmpresa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  tipo: StatusTipo;
  origem: StatusOrigem;
}

export function normalizeStatusNome(nome: string | null | undefined): string {
  return (nome || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

export function nomesStatusIguais(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeStatusNome(a);
  const nb = normalizeStatusNome(b);
  return !!na && na === nb;
}

export function isStatusEntregue(nome: string | null | undefined): boolean {
  return normalizeStatusNome(nome) === 'ENTREGUE';
}

export function findStatusByNome(
  lista: StatusEmpresa[],
  nome: string | null | undefined
): StatusEmpresa | undefined {
  if (!nome) return undefined;
  return lista.find((s) => nomesStatusIguais(s.nome, nome));
}

export function ensureStatusNaLista(
  lista: StatusEmpresa[],
  nomeAtual: string | null | undefined,
  tipo: StatusTipo = 'os'
): StatusEmpresa[] {
  const nome = (nomeAtual || '').trim();
  if (!nome) return lista;
  if (findStatusByNome(lista, nome)) return lista;
  return [
    ...lista,
    {
      id: `atual-${normalizeStatusNome(nome)}`,
      nome,
      cor: '#6b7280',
      ordem: 9999,
      tipo,
      origem: 'personalizado',
    },
  ];
}

const COR_PADRAO = '#6b7280';

function mapRow(
  row: { id?: string; nome?: string; cor?: string | null; ordem?: number | null; tipo?: string | null },
  origem: StatusOrigem,
  tipo: StatusTipo
): StatusEmpresa | null {
  if (!row?.id || !row?.nome) return null;
  return {
    id: row.id,
    nome: row.nome,
    cor: row.cor || COR_PADRAO,
    ordem: typeof row.ordem === 'number' ? row.ordem : 999,
    tipo: (row.tipo === 'tecnico' ? 'tecnico' : tipo),
    origem,
  };
}

function dedupePorNome(lista: StatusEmpresa[]): StatusEmpresa[] {
  const seen = new Set<string>();
  const out: StatusEmpresa[] = [];
  for (const item of lista) {
    const key = normalizeStatusNome(item.nome);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function fetchStatusEmpresa(
  client: Pick<SupabaseClient, 'from'>,
  params: {
    empresaId?: string | null;
    tipo: StatusTipo;
    excludeNomes?: string[];
  }
): Promise<StatusEmpresa[]> {
  const { empresaId, tipo, excludeNomes = [] } = params;
  const exclude = new Set(excludeNomes.map(normalizeStatusNome).filter(Boolean));

  const [fixosRes, customRes] = await Promise.all([
    client
      .from('status_fixo')
      .select('id, nome, cor, ordem, tipo')
      .eq('tipo', tipo)
      .order('ordem', { ascending: true }),
    empresaId
      ? client
          .from('status')
          .select('id, nome, cor, ordem, tipo')
          .eq('tipo', tipo)
          .eq('empresa_id', empresaId)
          .order('ordem', { ascending: true })
      : Promise.resolve({ data: [] as never[], error: null }),
  ]);

  const fixos = (fixosRes.data || [])
    .map((row) => mapRow(row, 'fixo', tipo))
    .filter((s): s is StatusEmpresa => !!s);
  const custom = (customRes.data || [])
    .map((row) => mapRow(row, 'personalizado', tipo))
    .filter((s): s is StatusEmpresa => !!s);

  return dedupePorNome([...fixos, ...custom]).filter(
    (s) => !exclude.has(normalizeStatusNome(s.nome))
  );
}

export const STATUS_CRIACAO_OS: StatusEmpresa[] = [
  {
    id: 'orcamento',
    nome: 'ORÇAMENTO',
    cor: '#f59e0b',
    ordem: 1,
    tipo: 'os',
    origem: 'fixo',
  },
  {
    id: 'aprovado',
    nome: 'APROVADO',
    cor: '#10b981',
    ordem: 2,
    tipo: 'os',
    origem: 'fixo',
  },
  {
    id: 'retorno_garantia',
    nome: 'RETORNO GARANTIA',
    cor: '#ef4444',
    ordem: 3,
    tipo: 'os',
    origem: 'fixo',
  },
];

/** Nova OS: tipos de entrada + status personalizados da empresa. */
export function montarStatusCriacaoOS(catalogo: StatusEmpresa[]): StatusEmpresa[] {
  const baseKeys = new Set(STATUS_CRIACAO_OS.map((s) => normalizeStatusNome(s.nome)));
  const extras = catalogo.filter((s) => {
    if (s.origem !== 'personalizado') return false;
    if (isStatusEntregue(s.nome)) return false;
    return !baseKeys.has(normalizeStatusNome(s.nome));
  });
  return [...STATUS_CRIACAO_OS, ...extras];
}

export function descricaoStatusCriacaoOS(nome: string): string {
  const n = normalizeStatusNome(nome);
  if (n === 'ORCAMENTO') {
    return 'Cliente deixou para orçamento - será necessário fazer orçamento posteriormente';
  }
  if (n === 'RETORNO GARANTIA') {
    return 'Aparelho retornou para garantia - reparo sem custo adicional';
  }
  if (n === 'APROVADO') {
    return 'Cliente já aprovou o valor - OS pode prosseguir para execução';
  }
  return 'Status personalizado da empresa';
}

export function descricaoStatusCriacaoOSResumo(nome: string): string {
  const n = normalizeStatusNome(nome);
  if (n === 'ORCAMENTO') return 'Será necessário fazer orçamento posteriormente';
  if (n === 'RETORNO GARANTIA') return 'Reparo sem custo adicional - aparelho em garantia';
  if (n === 'APROVADO') return 'OS pode prosseguir para execução';
  return 'A OS será criada com este status';
}
