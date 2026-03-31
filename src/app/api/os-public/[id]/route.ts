import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /api/os-public/[id]
 * Busca OS por id (UUID) ou numero_os para uso no link público.
 * Usa service role (mesmo padrão da API ordens/[id]) para não depender de RLS.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error('[os-public] Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Configuração do servidor inválida' }, { status: 500 });
    }

    const supabase = createServerClient(url, serviceKey, {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    });

    // Tentar por UUID primeiro, depois por numero_os
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let os: { id: string; empresa_id: string; numero_os: string | number } | null = null;
    let osError: { message: string; code: string } | null = null;

    if (isUuid) {
      const res = await supabase
        .from('ordens_servico')
        .select('id, empresa_id, numero_os')
        .eq('id', id)
        .maybeSingle();
      os = res.data;
      osError = res.error;
    }

    if (!os && !osError) {
      const res = await supabase
        .from('ordens_servico')
        .select('id, empresa_id, numero_os')
        .eq('numero_os', id)
        .maybeSingle();
      os = res.data;
      osError = res.error;
    }

    if (osError) {
      console.error('[os-public] Erro Supabase:', osError.message, osError.code);
      return NextResponse.json(
        { error: 'Erro ao buscar OS', code: osError.code },
        { status: 500 }
      );
    }

    if (!os) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[os-public] Nenhuma OS encontrada para id:', id);
      }
      return NextResponse.json({ notFound: true }, { status: 404 });
    }

    // Buscar link_publico_ativo da empresa
    let linkPublicoAtivo = true;
    if (os.empresa_id) {
      try {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('link_publico_ativo')
          .eq('id', os.empresa_id)
          .maybeSingle();
        linkPublicoAtivo = (empresa as { link_publico_ativo?: boolean } | null)?.link_publico_ativo ?? true;
      } catch {
        linkPublicoAtivo = true;
      }
    }

    return NextResponse.json({
      ok: true,
      osId: os.id,
      numeroOs: os.numero_os,
      empresaId: os.empresa_id,
      linkPublicoAtivo: !!linkPublicoAtivo,
      desativado: !linkPublicoAtivo,
    });
  } catch (e) {
    console.error('[os-public] Erro:', e);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
