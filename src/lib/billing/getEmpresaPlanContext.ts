import type { SupabaseClient } from '@supabase/supabase-js';
import { pickAssinaturaParaContexto } from '@/lib/billing/pickAssinatura';
import { PLANO_SLUGS } from '@/config/planModules';

export interface EmpresaPlanContext {
  empresaId: string;
  planoRecursos: Record<string, unknown>;
  recursosCustomizados: Record<string, boolean> | null;
  isTrial: boolean;
  sistemaLiberado: boolean;
  planoSlug: string | null;
  planoId: string | null;
}

export async function getEmpresaPlanContext(
  admin: SupabaseClient,
  empresaId: string
): Promise<EmpresaPlanContext | null> {
  const [{ data: empresa }, { data: assinaturas }] = await Promise.all([
    admin
      .from('empresas')
      .select('recursos_customizados, sistema_liberado, created_at, dias_trial')
      .eq('id', empresaId)
      .maybeSingle(),
    admin
      .from('assinaturas')
      .select('*, planos(id, slug, nome, recursos_disponiveis)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (!empresa) return null;

  const empresaCreatedAt = (empresa.created_at as string | undefined) ?? null;
  const picked = assinaturas?.length
    ? pickAssinaturaParaContexto(
        assinaturas as Record<string, unknown>[],
        empresaCreatedAt,
        empresa.dias_trial as number | null | undefined
      )
    : null;

  const isTrial =
    picked?.status === 'trial' ||
    (!picked && !!empresaCreatedAt);

  let planoRecursos: Record<string, unknown> = {};
  let planoSlug: string | null = null;
  let planoId: string | null = null;

  if (picked?.plano_id) {
    planoId = picked.plano_id as string;
    const rawPlanos = picked.planos;
    const plano = (Array.isArray(rawPlanos) ? rawPlanos[0] : rawPlanos) as
      | Record<string, unknown>
      | null
      | undefined;
    if (plano) {
      planoSlug = (plano.slug as string) ?? null;
      planoRecursos = (plano.recursos_disponiveis as Record<string, unknown>) ?? {};
    }
  }

  if (!planoSlug && isTrial) {
    planoSlug = PLANO_SLUGS.TRIAL;
  }

  return {
    empresaId,
    planoRecursos,
    recursosCustomizados: (empresa.recursos_customizados as Record<string, boolean> | null) ?? null,
    isTrial,
    sistemaLiberado: empresa.sistema_liberado === true,
    planoSlug,
    planoId,
  };
}
