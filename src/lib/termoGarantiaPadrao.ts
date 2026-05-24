import { v5 as uuidv5 } from 'uuid';

/** Namespace fixo para gerar UUID determinístico por empresa */
const TERMO_PADRAO_NAMESPACE = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

/** Modelo original do sistema — nunca alterado, usado como exemplo para novas empresas */
export const TERMO_GARANTIA_MODELO_NOME = 'Garantia Padrão — 90 dias';

export const TERMO_GARANTIA_MODELO_CONTEUDO = `
<h3>Termo de Garantia do Serviço</h3>
<p>Garantimos o serviço executado pelo prazo de <strong>90 (noventa) dias</strong>, contados a partir da data de entrega do equipamento.</p>
<p><strong>Cobertura:</strong> o serviço realizado e as peças substituídas por nós, desde que o aparelho não apresente sinais de mau uso, queda, contato com líquidos ou violação de lacres.</p>
<p><strong>Exclusões:</strong> danos causados por mau uso, acidentes, umidade, alterações não autorizadas e desgaste natural de componentes.</p>
<p>Para acionar a garantia, apresente este documento e o equipamento para avaliação em nossa assistência.</p>
`.trim();

/** @deprecated use TERMO_GARANTIA_MODELO_* */
export const TERMO_GARANTIA_PADRAO_NOME = TERMO_GARANTIA_MODELO_NOME;
/** @deprecated use TERMO_GARANTIA_MODELO_* */
export const TERMO_GARANTIA_PADRAO_CONTEUDO = TERMO_GARANTIA_MODELO_CONTEUDO;

export interface TermoGarantia {
  id: string;
  nome: string;
  conteudo: string;
  ativo: boolean;
  ordem?: number;
  empresa_id?: string;
  /** Termo derivado do modelo do sistema (editável por empresa) */
  is_sistema?: boolean;
  /** Empresa já personalizou a cópia local */
  personalizado?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** ID determinístico do termo padrão por empresa (compatível com FK) */
export function getTermoGarantiaPadraoId(empresaId: string): string {
  return uuidv5(`termo-garantia-padrao:${empresaId}`, TERMO_PADRAO_NAMESPACE);
}

export function isTermoGarantiaPadraoId(id: string | null | undefined, empresaId?: string): boolean {
  if (!id || !empresaId) return false;
  return id === getTermoGarantiaPadraoId(empresaId);
}

/** Modelo original do sistema (somente leitura, para exemplos e restauração) */
export function getTermoGarantiaModeloSistema(empresaId: string): TermoGarantia {
  return {
    id: getTermoGarantiaPadraoId(empresaId),
    nome: TERMO_GARANTIA_MODELO_NOME,
    conteudo: TERMO_GARANTIA_MODELO_CONTEUDO,
    ativo: true,
    ordem: 0,
    empresa_id: empresaId,
    is_sistema: true,
    personalizado: false,
  };
}

/** @deprecated use getTermoGarantiaModeloSistema */
export function getTermoGarantiaPadrao(empresaId: string): TermoGarantia {
  return getTermoGarantiaModeloSistema(empresaId);
}

/** Resolve a cópia da empresa: DB se existir, senão o modelo do sistema */
export function resolverTermoPadraoEmpresa(
  empresaId: string,
  registroDb?: TermoGarantia | null
): TermoGarantia {
  const modelo = getTermoGarantiaModeloSistema(empresaId);
  if (!registroDb) return modelo;

  return {
    ...modelo,
    nome: registroDb.nome || modelo.nome,
    conteudo: registroDb.conteudo || modelo.conteudo,
    ativo: registroDb.ativo ?? true,
    ordem: registroDb.ordem ?? 0,
    personalizado: true,
    created_at: registroDb.created_at,
    updated_at: registroDb.updated_at,
  };
}

/** Insere o modelo no banco apenas se a empresa ainda não tiver cópia (não sobrescreve edições) */
export async function ensureTermoGarantiaPadraoNoBanco(
  supabase: { from: (table: string) => any },
  empresaId: string
): Promise<TermoGarantia> {
  const padraoId = getTermoGarantiaPadraoId(empresaId);

  const { data: existente } = await supabase
    .from('termos_garantia')
    .select('*')
    .eq('id', padraoId)
    .maybeSingle();

  if (existente) {
    return resolverTermoPadraoEmpresa(empresaId, existente as TermoGarantia);
  }

  const modelo = getTermoGarantiaModeloSistema(empresaId);
  await supabase.from('termos_garantia').insert({
    id: modelo.id,
    empresa_id: empresaId,
    nome: modelo.nome,
    conteudo: modelo.conteudo,
    ativo: true,
    ordem: 0,
  });

  return modelo;
}

/** Carrega a cópia da empresa ou o modelo do sistema */
export async function carregarTermoPadraoEmpresa(
  supabase: { from: (table: string) => any },
  empresaId: string
): Promise<TermoGarantia> {
  const padraoId = getTermoGarantiaPadraoId(empresaId);
  const { data } = await supabase
    .from('termos_garantia')
    .select('*')
    .eq('id', padraoId)
    .maybeSingle();

  return resolverTermoPadraoEmpresa(empresaId, data as TermoGarantia | null);
}

/** Mescla termo padrão (modelo ou cópia editada) com termos personalizados */
export function mesclarTermosGarantia(empresaId: string, termosDb: TermoGarantia[] = []): TermoGarantia[] {
  const padraoId = getTermoGarantiaPadraoId(empresaId);
  const registroPadrao = termosDb.find((t) => t.id === padraoId);
  const customizados = termosDb.filter((t) => t.id !== padraoId);
  return [resolverTermoPadraoEmpresa(empresaId, registroPadrao), ...customizados];
}

/** Resolve termo por ID */
export function resolverTermoGarantia(
  termoId: string | null | undefined,
  empresaId: string,
  termosDb: TermoGarantia[] = []
): TermoGarantia | null {
  if (!termoId) return null;
  if (isTermoGarantiaPadraoId(termoId, empresaId)) {
    const registroPadrao = termosDb.find((t) => t.id === termoId);
    return resolverTermoPadraoEmpresa(empresaId, registroPadrao);
  }
  return termosDb.find((t) => t.id === termoId) ?? null;
}

/** Mantém termo como está (cópia da empresa ou personalizado) */
export function normalizarTermoGarantia(termo: TermoGarantia | null, empresaId?: string): TermoGarantia | null {
  if (!termo || !empresaId) return termo;
  if (isTermoGarantiaPadraoId(termo.id, empresaId)) {
    return resolverTermoPadraoEmpresa(empresaId, termo);
  }
  return termo;
}

/** Restaura a cópia da empresa para o modelo original do sistema */
export async function restaurarTermoModeloSistema(
  supabase: { from: (table: string) => any },
  empresaId: string
): Promise<TermoGarantia> {
  const modelo = getTermoGarantiaModeloSistema(empresaId);

  await supabase.from('termos_garantia').upsert(
    {
      id: modelo.id,
      empresa_id: empresaId,
      nome: modelo.nome,
      conteudo: modelo.conteudo,
      ativo: true,
      ordem: 0,
    },
    { onConflict: 'id' }
  );

  return modelo;
}

/** Remove personalização — volta a usar só o modelo em memória */
export async function removerPersonalizacaoTermoPadrao(
  supabase: { from: (table: string) => any },
  empresaId: string
): Promise<TermoGarantia> {
  const padraoId = getTermoGarantiaPadraoId(empresaId);
  await supabase.from('termos_garantia').delete().eq('id', padraoId).eq('empresa_id', empresaId);
  return getTermoGarantiaModeloSistema(empresaId);
}
