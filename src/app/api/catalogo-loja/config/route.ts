import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { slugifyCatalogo } from '@/lib/catalogo-publico';

async function resolveEmpresaId(authUserId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('usuarios')
    .select('empresa_id')
    .or(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`)
    .maybeSingle();
  return data?.empresa_id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const authUserId = await getAuthUserIdFromRequest(request);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const empresaId = await resolveEmpresaId(authUserId);
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('configuracoes_empresa')
      .select(
        'catalogo_loja_habilitado, catalogo_loja_slug, catalogo_loja_titulo, catalogo_loja_descricao, catalogo_loja_whatsapp, catalogo_loja_cor'
      )
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      empresa_id: empresaId,
      config: {
        habilitado: Boolean(data?.catalogo_loja_habilitado),
        slug: (data?.catalogo_loja_slug || '').trim(),
        titulo: (data?.catalogo_loja_titulo || '').trim(),
        descricao: (data?.catalogo_loja_descricao || '').trim(),
        whatsapp: (data?.catalogo_loja_whatsapp || '').trim(),
        cor: (data?.catalogo_loja_cor || '#111111').trim() || '#111111',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUserId = await getAuthUserIdFromRequest(request);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const empresaId = await resolveEmpresaId(authUserId);
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const finalSlug = slugifyCatalogo(String(body.slug || body.titulo || ''));
    if (!finalSlug) {
      return NextResponse.json({ error: 'Informe um endereço (slug) válido para o catálogo.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Slug único entre empresas
    const { data: conflito } = await admin
      .from('configuracoes_empresa')
      .select('empresa_id')
      .ilike('catalogo_loja_slug', finalSlug)
      .neq('empresa_id', empresaId)
      .maybeSingle();

    if (conflito?.empresa_id) {
      return NextResponse.json(
        { error: 'Este endereço (slug) já está em uso por outra empresa. Escolha outro.' },
        { status: 409 }
      );
    }

    const payload = {
      empresa_id: empresaId,
      catalogo_loja_habilitado: Boolean(body.habilitado),
      catalogo_loja_slug: finalSlug,
      catalogo_loja_titulo: String(body.titulo || '').trim() || null,
      catalogo_loja_descricao: String(body.descricao || '').trim() || null,
      catalogo_loja_whatsapp: String(body.whatsapp || '').trim() || null,
      catalogo_loja_cor: String(body.cor || '#111111').trim() || '#111111',
    };

    const { data, error } = await admin
      .from('configuracoes_empresa')
      .upsert(payload, { onConflict: 'empresa_id' })
      .select(
        'catalogo_loja_habilitado, catalogo_loja_slug, catalogo_loja_titulo, catalogo_loja_descricao, catalogo_loja_whatsapp, catalogo_loja_cor'
      )
      .single();

    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return NextResponse.json(
          { error: 'Este endereço (slug) já está em uso por outra empresa. Escolha outro.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      config: {
        habilitado: Boolean(data.catalogo_loja_habilitado),
        slug: (data.catalogo_loja_slug || '').trim(),
        titulo: (data.catalogo_loja_titulo || '').trim(),
        descricao: (data.catalogo_loja_descricao || '').trim(),
        whatsapp: (data.catalogo_loja_whatsapp || '').trim(),
        cor: (data.catalogo_loja_cor || '#111111').trim() || '#111111',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
