import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/** Valor padrão quando não há config no banco */
const VALOR_PADRAO = 119.9;

/**
 * GET /api/assinatura/valor
 * Retorna o valor mensal da assinatura (público, usado na landing, planos, pagar, renovar)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('config_sistema')
      .select('valor')
      .eq('chave', 'valor_assinatura_mensal')
      .maybeSingle();

    if (error) {
      console.warn('config_sistema valor_assinatura_mensal:', error.message);
      return NextResponse.json({ valor: VALOR_PADRAO });
    }

    const valor = data?.valor != null ? parseFloat(String(data.valor)) : VALOR_PADRAO;
    const valorFinal = Number.isFinite(valor) && valor > 0 ? valor : VALOR_PADRAO;

    return NextResponse.json({ valor: valorFinal });
  } catch (err) {
    console.error('GET /api/assinatura/valor:', err);
    return NextResponse.json({ valor: VALOR_PADRAO });
  }
}
