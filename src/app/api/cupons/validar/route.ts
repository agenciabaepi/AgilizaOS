import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PLANO_SLUGS } from '@/config/planModules';
import { obterPrecoCobrancaEmpresa, validarCupomDesconto } from '@/lib/billing/cupomServer';
import { normalizarCodigoCupom } from '@/lib/billing/cupomDesconto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearerToken) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabaseAuth.auth.getUser(bearerToken);
    if (!error && data.user) return data.user;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!authError && user) return user;
  return null;
}

/** Preview do cupom (não reserva — reserva só ao gerar PIX). */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const codigo = typeof body.codigo === 'string' ? body.codigo : '';
    const planoSlug = body.plano_slug;

    if (!codigo.trim()) {
      return NextResponse.json({ ok: false, error: 'Informe o código do cupom' }, { status: 400 });
    }

    if (planoSlug !== PLANO_SLUGS.BASICO && planoSlug !== PLANO_SLUGS.COMPLETO) {
      return NextResponse.json({ ok: false, error: 'Plano inválido' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario } = await admin
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!usuario?.empresa_id) {
      return NextResponse.json({ ok: false, error: 'Empresa não encontrada' }, { status: 403 });
    }

    const cobranca = await obterPrecoCobrancaEmpresa(admin, usuario.empresa_id, planoSlug);
    if (!cobranca) {
      return NextResponse.json({ ok: false, error: 'Preço do plano indisponível' }, { status: 400 });
    }

    const result = await validarCupomDesconto(
      admin,
      normalizarCodigoCupom(codigo),
      cobranca.preco
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      codigo: result.codigo,
      percentual: result.percentual,
      valor_original: result.valor_original,
      valor_desconto: result.valor_desconto,
      valor_final: result.valor_final,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao validar cupom';
    console.error('POST /api/cupons/validar:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
