import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/os-public/[id]/validar-senha
 * Body: { senha: string }
 * Valida a senha de acesso da OS (senha_acesso) e retorna { ok: true } ou { ok: false }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const senha = typeof body.senha === 'string' ? body.senha.trim() : '';

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Configuração inválida' }, { status: 500 });
    }

    const supabase = createServerClient(url, serviceKey, {
      cookies: { get() { return undefined; }, set() {}, remove() {} },
    });

    // Mesma lógica da GET: tentar por UUID primeiro, depois por numero_os (evita .or() com tipos diferentes)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let os: { id: string; senha_acesso?: string | null; empresa_id: string } | null = null;
    let lookupError: { message: string; code: string } | null = null;

    if (isUuid) {
      const res = await supabase
        .from('ordens_servico')
        .select('id, senha_acesso, empresa_id')
        .eq('id', id)
        .maybeSingle();
      os = res.data;
      lookupError = res.error;
    }
    if (!os && !lookupError) {
      const res = await supabase
        .from('ordens_servico')
        .select('id, senha_acesso, empresa_id')
        .eq('numero_os', id)
        .maybeSingle();
      os = res.data;
      lookupError = res.error;
      if (!os && !lookupError && /^\d+$/.test(id)) {
        const resNum = await supabase
          .from('ordens_servico')
          .select('id, senha_acesso, empresa_id')
          .eq('numero_os', parseInt(id, 10))
          .maybeSingle();
        os = resNum.data;
        lookupError = resNum.error;
      }
    }

    if (lookupError) {
      console.error('[os-public validar-senha] Erro Supabase:', lookupError.message);
      return NextResponse.json({ ok: false, error: 'Erro ao buscar OS' }, { status: 500 });
    }
    if (!os) {
      return NextResponse.json({ ok: false, error: 'OS não encontrada' }, { status: 404 });
    }

    // Verificar link público ativo
    const { data: empresa } = await supabase
      .from('empresas')
      .select('link_publico_ativo')
      .eq('id', os.empresa_id)
      .maybeSingle();
    const ativo = (empresa as { link_publico_ativo?: boolean } | null)?.link_publico_ativo ?? true;
    if (!ativo) {
      return NextResponse.json({ ok: false, error: 'Recurso desativado' }, { status: 403 });
    }

    const senhaOs = (os as { senha_acesso?: string | null }).senha_acesso;
    const senhaOk = senhaOs != null && String(senhaOs).trim() !== '' && String(senhaOs).trim().toLowerCase() === senha.toLowerCase();

    if (!senhaOk) {
      return NextResponse.json({ ok: false, error: 'Senha incorreta' }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[os-public validar-senha]', e);
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 });
  }
}
