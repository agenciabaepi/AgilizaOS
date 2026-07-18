import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PLANOS_VENDA } from '@/config/planModules';
import { obterPrecoCobrancaEmpresa } from '@/lib/billing/cupomServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getAuthUserId(req: NextRequest): Promise<string | null> {
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
    if (!error && data.user) return data.user.id;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * GET /api/planos/publicos
 * Lista planos vendáveis. Se o usuário estiver autenticado e a empresa tiver
 * valor personalizado na assinatura, esse preço substitui o do catálogo.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('planos')
      .select('id, slug, nome, descricao, preco, recursos_disponiveis')
      .eq('ativo', true)
      .in('slug', [...PLANOS_VENDA])
      .order('preco', { ascending: true });

    if (error) {
      console.error('GET /api/planos/publicos:', error.message);
      return NextResponse.json({ planos: [] });
    }

    let empresaId: string | null = null;
    const authUserId = await getAuthUserId(req);
    if (authUserId) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .or(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`)
        .maybeSingle();
      empresaId = usuario?.empresa_id ?? null;
    }

    const planos = await Promise.all(
      (data ?? []).map(async (p) => {
        const precoCatalogo =
          typeof p.preco === 'number' ? p.preco : parseFloat(String(p.preco)) || 0;
        let preco = precoCatalogo;
        let personalizado = false;

        if (empresaId && p.slug) {
          const cobranca = await obterPrecoCobrancaEmpresa(supabase, empresaId, String(p.slug));
          if (cobranca) {
            preco = cobranca.preco;
            personalizado = cobranca.personalizado;
          }
        }

        return {
          id: p.id,
          slug: p.slug,
          nome: p.nome,
          descricao: p.descricao ?? '',
          preco,
          preco_catalogo: precoCatalogo,
          personalizado,
          recursos_disponiveis: (p.recursos_disponiveis as Record<string, boolean>) ?? {},
        };
      })
    );

    return NextResponse.json({ planos });
  } catch (err) {
    console.error('GET /api/planos/publicos:', err);
    return NextResponse.json({ planos: [] });
  }
}
