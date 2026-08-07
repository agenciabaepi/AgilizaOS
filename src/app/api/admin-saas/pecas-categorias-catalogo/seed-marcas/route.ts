import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { PECAS_MARCAS_PADRAO, marcaIconUrl } from '@/lib/pecas-marcas';

/** Importa marcas padrão (iPhone, Samsung...) em todos os grupos, com logos do Simple Icons. */
export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const grupoId = body.grupo_id ? String(body.grupo_id).trim() : null;
    const forcarLogo = body.forcar_logo === true;

    const supabase = getSupabaseAdmin();

    let gruposQuery = supabase.from('pecas_grupos_catalogo').select('id, nome').eq('ativo', true);
    if (grupoId) gruposQuery = gruposQuery.eq('id', grupoId);

    const { data: grupos, error: gErr } = await gruposQuery;
    if (gErr) {
      return NextResponse.json({ ok: false, error: gErr.message }, { status: 500 });
    }
    if (!grupos?.length) {
      return NextResponse.json({ ok: false, error: 'Nenhum grupo encontrado' }, { status: 404 });
    }

    const grupoIds = grupos.map((g) => g.id);
    const { data: existentes } = await supabase
      .from('pecas_categorias_catalogo')
      .select('id, grupo_id, slug, imagem_url')
      .in('grupo_id', grupoIds);

    const porChave = new Map(
      (existentes || []).map((c) => [`${c.grupo_id}:${c.slug}`, c] as const)
    );

    let criadas = 0;
    let atualizadas = 0;

    for (const g of grupos) {
      for (const m of PECAS_MARCAS_PADRAO) {
        const key = `${g.id}:${m.slug}`;
        const atual = porChave.get(key);
        const logo = marcaIconUrl(m.icon, m.cor);

        if (!atual) {
          const { error } = await supabase.from('pecas_categorias_catalogo').insert({
            grupo_id: g.id,
            nome: m.nome,
            slug: m.slug,
            imagem_url: logo,
            ordem: m.ordem,
            ativo: true,
          });
          if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
          }
          criadas += 1;
          continue;
        }

        const precisaLogo = forcarLogo || !atual.imagem_url;
        const { error } = await supabase
          .from('pecas_categorias_catalogo')
          .update({
            nome: m.nome,
            ordem: m.ordem,
            ativo: true,
            ...(precisaLogo ? { imagem_url: logo } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', atual.id);

        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
        atualizadas += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Marcas sincronizadas: ${criadas} novas, ${atualizadas} atualizadas.`,
      grupos: grupos.length,
      marcas: PECAS_MARCAS_PADRAO.length,
      criadas,
      atualizadas,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
