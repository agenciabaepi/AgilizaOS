import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Resolve o auth user id em Route Handlers quando o app usa sessão no browser (localStorage)
 * e envia `Authorization: Bearer <access_token>`.
 *
 * `createServerSupabaseClient().auth.getUser(jwt)` com @supabase/ssr nem sempre valida o JWT;
 * o fluxo que funciona é o mesmo de `/api/assinatura/minha`: cliente anon isolado + getUser(jwt),
 * depois fallback em cookies.
 */
export async function getAuthUserIdFromRequest(request: Request): Promise<string | null> {
  const raw = request.headers.get('Authorization');
  const bearer = raw?.replace(/^Bearer\s+/i, '').trim();
  if (bearer) {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await sb.auth.getUser(bearer);
    if (!error && data.user?.id) return data.user.id;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user?.id) return user.id;

  return null;
}
