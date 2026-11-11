import type { SupabaseClient } from '@supabase/supabase-js';
import { carregarLogoNota, type CupomLogo } from './cupom-termico';

/** Busca logo_url da empresa e carrega bytes (fallback: logo do sistema). */
export async function logoParaNotas(
  admin: SupabaseClient,
  empresaId: string
): Promise<CupomLogo | null> {
  const { data } = await admin
    .from('empresas')
    .select('logo_url')
    .eq('id', empresaId)
    .maybeSingle();
  return carregarLogoNota(data?.logo_url);
}
