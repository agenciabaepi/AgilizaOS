import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Resolve o usuário da sessão (cookies Supabase SSR) ou header Authorization Bearer.
 */
export async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: cookieUser },
    error: cookieErr,
  } = await supabase.auth.getUser();
  if (!cookieErr && cookieUser?.id) return cookieUser.id;

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user: tokenUser },
      error: tokenErr,
    } = await anon.auth.getUser(token);
    if (!tokenErr && tokenUser?.id) return tokenUser.id;
  }

  return null;
}

/**
 * Empresa do vínculo em `usuarios` (legado: `id` = auth.uid() com `auth_user_id` nulo).
 */
export async function getEmpresaIdForUser(userId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('usuarios')
    .select('empresa_id')
    .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  if (error || !data?.empresa_id) return null;
  return data.empresa_id as string;
}

export interface UsuarioAuthRow {
  id: string;
  nome: string | null;
  nivel: string | null;
  empresa_id: string | null;
}

/** Registro em `usuarios` vinculado ao auth (auth_user_id ou id legado). */
export async function getUsuarioForAuth(userId: string): Promise<UsuarioAuthRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('usuarios')
    .select('id, nome, nivel, empresa_id')
    .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  if (error || !data) return null;
  return data as UsuarioAuthRow;
}
