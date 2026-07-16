import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { temAcessoRecurso } from '@/lib/billing/planResources';
import { getEmpresaPlanContext } from '@/lib/billing/getEmpresaPlanContext';
import { PLANO_COMPLETO_NOME } from '@/config/planModules';

export async function getEmpresaIdForSession(req: NextRequest): Promise<string | null> {
  const userId = await getSessionUserId(req);
  if (!userId) return null;

  const admin = getSupabaseAdmin();
  const { data: usuario } = await admin
    .from('usuarios')
    .select('empresa_id')
    .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  return usuario?.empresa_id ?? null;
}

export async function empresaTemRecurso(
  empresaId: string,
  modulo: string
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const ctx = await getEmpresaPlanContext(admin, empresaId);
  if (!ctx) return false;

  return temAcessoRecurso(modulo, {
    planoRecursos: ctx.planoRecursos,
    recursosCustomizados: ctx.recursosCustomizados,
    isTrial: ctx.isTrial,
    sistemaLiberado: ctx.sistemaLiberado,
    planoSlug: ctx.planoSlug,
  });
}

type AssertOk = { ok: true; empresaId: string };
type AssertFail = { ok: false; response: NextResponse };

export async function assertTemRecurso(
  req: NextRequest,
  modulo: string
): Promise<AssertOk | AssertFail> {
  const empresaId = await getEmpresaIdForSession(req);
  if (!empresaId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    };
  }

  const allowed = await empresaTemRecurso(empresaId, modulo);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Recurso não disponível no seu plano',
          modulo,
          upgrade: PLANO_COMPLETO_NOME,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, empresaId };
}
