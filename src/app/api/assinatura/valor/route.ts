import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PLANO_SLUGS } from '@/config/planModules';

const VALOR_PADRAO_COMPLETO = 149.9;

/**
 * GET /api/assinatura/valor
 * @deprecated Preferir GET /api/planos/publicos. Retorna preço do Plano Completo.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('planos')
      .select('preco')
      .eq('slug', PLANO_SLUGS.COMPLETO)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      console.warn('planos completo preco:', error.message);
      return NextResponse.json({ valor: VALOR_PADRAO_COMPLETO });
    }

    const valor = data?.preco != null ? parseFloat(String(data.preco)) : VALOR_PADRAO_COMPLETO;
    const valorFinal = Number.isFinite(valor) && valor > 0 ? valor : VALOR_PADRAO_COMPLETO;

    return NextResponse.json({ valor: valorFinal });
  } catch (err) {
    console.error('GET /api/assinatura/valor:', err);
    return NextResponse.json({ valor: VALOR_PADRAO_COMPLETO });
  }
}
