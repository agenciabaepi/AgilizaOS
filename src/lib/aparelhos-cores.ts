import type { AparelhoCatalogoCor, CorCatalogo } from '@/types/cores';
import type { AparelhoImagensRow, AparelhoImagensResolved } from '@/lib/aparelhos-imagens';
import { aparelhoImagensParaSelecionado, resolveAparelhoImagens } from '@/lib/aparelhos-imagens';
import type { AparelhoSelecionado } from '@/types/aparelhos';

export function ordenarCoresAparelho(cores: AparelhoCatalogoCor[]): AparelhoCatalogoCor[] {
  return [...cores]
    .filter((c) => c.ativo !== false)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || (a.cor_nome || '').localeCompare(b.cor_nome || ''));
}

export function resolveAparelhoImagensComCor(
  aparelho: AparelhoImagensRow & { cores?: AparelhoCatalogoCor[] },
  corId?: string | null
): AparelhoImagensResolved {
  const cores = ordenarCoresAparelho(aparelho.cores || []);

  if (corId) {
    const escolhida = cores.find((c) => c.cor_id === corId || c.id === corId);
    if (escolhida) {
      const imgs = resolveAparelhoImagens(escolhida);
      if (imgs.frente || imgs.verso) return imgs;
    }
    return resolveAparelhoImagens(aparelho);
  }

  const primeira = cores[0];
  if (primeira) {
    const imgs = resolveAparelhoImagens(primeira);
    if (imgs.frente || imgs.verso) return imgs;
  }

  return resolveAparelhoImagens(aparelho);
}

/** Lista global de cores + imagens do aparelho quando existirem (para picker na Nova OS) */
export function mergeCoresParaPicker(
  coresCatalogo: CorCatalogo[],
  variantes?: AparelhoCatalogoCor[]
): AparelhoCatalogoCor[] {
  const porCorId = new Map((variantes || []).map((v) => [v.cor_id, v]));

  return [...coresCatalogo]
    .filter((c) => c.ativo !== false)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome))
    .map((c) => {
      const v = porCorId.get(c.id);
      if (v) return { ...v, cor_nome: v.cor_nome || c.nome, cor_hex: v.cor_hex ?? c.hex };
      return {
        id: `cat-${c.id}`,
        aparelho_catalogo_id: '',
        cor_id: c.id,
        cor_nome: c.nome,
        cor_hex: c.hex ?? null,
        imagem_url: null,
        imagem_frente_url: null,
        imagem_verso_url: null,
        ordem: c.ordem,
        ativo: true,
      };
    });
}

export function aparelhoSelecionadoComCor(
  base: Omit<AparelhoSelecionado, 'imagemUrl' | 'imagemFrenteUrl' | 'imagemVersoUrl' | 'corId' | 'corNome' | 'corHex'> & {
    cores?: AparelhoCatalogoCor[];
  } & AparelhoImagensRow,
  cor?: Pick<
    AparelhoCatalogoCor,
    'cor_id' | 'cor_nome' | 'cor_hex' | 'id' | 'imagem_url' | 'imagem_frente_url' | 'imagem_verso_url'
  > | null
): AparelhoSelecionado {
  const corId = cor?.cor_id ?? null;
  let imgs = resolveAparelhoImagensComCor(base, corId);
  if (cor) {
    const direto = resolveAparelhoImagens(cor);
    if (direto.frente || direto.verso) imgs = direto;
  }
  return {
    ...base,
    corId,
    corNome: cor?.cor_nome ?? null,
    corHex: cor?.cor_hex ?? null,
    coresDisponiveis: base.cores ? ordenarCoresAparelho(base.cores) : undefined,
    imagemUrl: imgs.primary,
    imagemFrenteUrl: imgs.frente,
    imagemVersoUrl: imgs.verso,
  };
}

export function primeiraCorAparelho(cores?: AparelhoCatalogoCor[]): AparelhoCatalogoCor | null {
  const lista = ordenarCoresAparelho(cores || []);
  return lista[0] ?? null;
}

export function aparelhoImagensParaSelecionadoComCor(
  row: AparelhoImagensRow & { cores?: AparelhoCatalogoCor[] },
  corId?: string | null
): Pick<AparelhoSelecionado, 'imagemUrl' | 'imagemFrenteUrl' | 'imagemVersoUrl'> {
  const resolved = resolveAparelhoImagensComCor(row, corId);
  return {
    imagemUrl: resolved.primary,
    imagemFrenteUrl: resolved.frente,
    imagemVersoUrl: resolved.verso,
  };
}

/** Mescla variante da API com item do picker (garante URLs de imagem) */
export function resolverCorParaAplicar(
  cor: AparelhoCatalogoCor,
  variantes: AparelhoCatalogoCor[]
): AparelhoCatalogoCor {
  const nome = (cor.cor_nome || '').trim().toUpperCase();
  const match =
    variantes.find((v) => v.cor_id === cor.cor_id) ||
    variantes.find((v) => (v.cor_nome || '').trim().toUpperCase() === nome);
  if (!match) return cor;
  return {
    ...cor,
    ...match,
    cor_id: match.cor_id || cor.cor_id,
    cor_nome: match.cor_nome || cor.cor_nome,
    cor_hex: match.cor_hex ?? cor.cor_hex,
    imagem_frente_url: match.imagem_frente_url ?? cor.imagem_frente_url,
    imagem_verso_url: match.imagem_verso_url ?? cor.imagem_verso_url,
    imagem_url: match.imagem_url ?? cor.imagem_url,
  };
}

/** Reexport para uso no selector */
export { aparelhoImagensParaSelecionado };
