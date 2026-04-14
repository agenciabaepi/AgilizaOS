import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Resumo da assinatura da empresa do usuário logado.
 * Usa service role após validar auth para não depender de RLS em `assinaturas`/`planos` no browser.
 */
export async function GET(req: NextRequest) {
  try {
    let authUserId: string | null = null;

    const bearer = req.headers.get('Authorization')?.startsWith('Bearer ')
      ? req.headers.get('Authorization')!.slice(7)
      : null;
    if (bearer) {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await sb.auth.getUser(bearer);
      if (!error && data.user) authUserId = data.user.id;
    }

    if (!authUserId) {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) authUserId = user.id;
    }

    if (!authUserId) {
      return NextResponse.json({ assinatura: null, error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: uErr } = await admin
      .from('usuarios')
      .select('empresa_id')
      .or(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`)
      .maybeSingle();

    if (uErr || !usuario?.empresa_id) {
      return NextResponse.json({ assinatura: null, empresa_created_at: null });
    }

    const empresaId = usuario.empresa_id;

    const [{ data: rows, error: aErr }, { data: empRow }] = await Promise.all([
      admin
        .from('assinaturas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(1),
      admin.from('empresas').select('created_at').eq('id', empresaId).maybeSingle(),
    ]);

    const empresaCreatedAt = (empRow?.created_at as string | undefined) ?? null;

    if (aErr || !rows?.length) {
      return NextResponse.json({ assinatura: null, empresa_created_at: empresaCreatedAt });
    }

    const row = rows[0] as Record<string, unknown>;
    let planos: Record<string, unknown> | null = null;
    const planoId = row.plano_id as string | undefined;
    if (planoId) {
      const { data: p } = await admin
        .from('planos')
        .select('nome, descricao, preco, limite_usuarios, limite_produtos, limite_clientes, limite_fornecedores, recursos_disponiveis')
        .eq('id', planoId)
        .maybeSingle();
      planos = p as Record<string, unknown> | null;
    }

    return NextResponse.json({
      assinatura: { ...row, planos },
      empresa_created_at: empresaCreatedAt,
    });
  } catch (e) {
    console.error('GET /api/assinatura/minha:', e);
    return NextResponse.json({ assinatura: null, error: 'Erro interno' }, { status: 500 });
  }
}
