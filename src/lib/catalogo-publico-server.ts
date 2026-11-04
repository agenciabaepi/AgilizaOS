import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { CatalogoPublicoConfig, CatalogoPublicoEmpresa } from '@/lib/catalogo-publico';

export type CatalogoLojaResolved = {
  empresa: CatalogoPublicoEmpresa;
  config: CatalogoPublicoConfig;
  empresaId: string;
};

export async function resolveCatalogoLojaBySlug(
  rawSlug: string
): Promise<{ ok: true; data: CatalogoLojaResolved } | { ok: false; status: number; error: string }> {
  const slug = (rawSlug || '').trim().toLowerCase();
  if (!slug || slug.length < 2) {
    return { ok: false, status: 400, error: 'Slug inválido' };
  }

  const supabase = getSupabaseAdmin();
  const { data: conf, error: confError } = await supabase
    .from('configuracoes_empresa')
    .select(
      'empresa_id, catalogo_loja_habilitado, catalogo_loja_slug, catalogo_loja_titulo, catalogo_loja_descricao, catalogo_loja_whatsapp, catalogo_loja_cor'
    )
    .ilike('catalogo_loja_slug', slug)
    .maybeSingle();

  if (confError) {
    return { ok: false, status: 500, error: confError.message };
  }

  if (!conf || !conf.catalogo_loja_habilitado || !conf.empresa_id) {
    return { ok: false, status: 404, error: 'Catálogo não encontrado ou desabilitado' };
  }

  const { data: empresa, error: empError } = await supabase
    .from('empresas')
    .select('id, nome, logo_url, endereco, telefone, email, website, ativo')
    .eq('id', conf.empresa_id)
    .maybeSingle();

  if (empError) {
    return { ok: false, status: 500, error: empError.message };
  }

  if (!empresa || empresa.ativo === false) {
    return { ok: false, status: 404, error: 'Empresa indisponível' };
  }

  const whatsapp =
    (typeof conf.catalogo_loja_whatsapp === 'string' && conf.catalogo_loja_whatsapp.trim()) ||
    (typeof empresa.telefone === 'string' && empresa.telefone.trim()) ||
    null;

  return {
    ok: true,
    data: {
      empresaId: empresa.id,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        logo_url: empresa.logo_url || null,
        endereco: empresa.endereco || null,
        telefone: empresa.telefone || null,
        email: empresa.email || null,
        website: empresa.website || null,
      },
      config: {
        slug: conf.catalogo_loja_slug || slug,
        titulo: (conf.catalogo_loja_titulo || '').trim() || empresa.nome,
        descricao: (conf.catalogo_loja_descricao || '').trim() || null,
        whatsapp,
        cor: (conf.catalogo_loja_cor || '#111111').trim() || '#111111',
      },
    },
  };
}
