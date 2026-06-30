import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PLANOS_VENDA } from '@/config/planModules';

/**
 * GET /api/planos/publicos
 * Lista planos vendáveis (Básico + Completo) com preços definidos no admin.
 */
export async function GET() {
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

    const planos = (data ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: typeof p.preco === 'number' ? p.preco : parseFloat(String(p.preco)) || 0,
      recursos_disponiveis: (p.recursos_disponiveis as Record<string, boolean>) ?? {},
    }));

    return NextResponse.json({ planos });
  } catch (err) {
    console.error('GET /api/planos/publicos:', err);
    return NextResponse.json({ planos: [] });
  }
}
