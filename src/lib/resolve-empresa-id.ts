import { supabase } from '@/lib/supabaseClient';

/**
 * Resolve empresa_id do contexto Auth ou da tabela usuarios (auth_user_id ou id legado).
 */
export async function resolveEmpresaIdForClient(
  empresaData?: { id?: string | null } | null,
  usuarioData?: { empresa_id?: string | null } | null
): Promise<string | null> {
  if (empresaData?.id) return empresaData.id;
  if (usuarioData?.empresa_id) return usuarioData.empresa_id;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  return data?.empresa_id ?? null;
}
