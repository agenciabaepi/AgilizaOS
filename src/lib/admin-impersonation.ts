import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const IMPERSONATION_COOKIE = 'admin_impersonation';

export type ImpersonationPayload = {
  logId: string;
  targetUsuarioId: string;
  targetNome: string;
  targetEmail: string;
  empresaId: string;
  empresaNome: string;
  returnUrl: string;
  adminEmail: string;
  startedAt: string;
};

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 4, // 4 horas
};

export function getAdminEmailFromCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): string {
  return cookieStore.get('admin_saas_email')?.value?.trim().toLowerCase() || 'platform_admin';
}

export function readImpersonationPayload(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): ImpersonationPayload | null {
  const raw = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ImpersonationPayload;
    if (!parsed?.logId || !parsed?.targetUsuarioId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setImpersonationCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  payload: ImpersonationPayload
): void {
  cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify(payload), COOKIE_OPTS);
}

export function clearImpersonationCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): void {
  cookieStore.delete(IMPERSONATION_COOKIE);
}

export async function createRouteHandlerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

/** Gera sessão Supabase para o e-mail do usuário alvo (via Admin API). */
export async function createImpersonationSession(targetEmail: string): Promise<Session> {
  const admin = getSupabaseAdmin();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(linkError?.message || 'Não foi possível gerar sessão de impersonation');
  }

  const { data: verifyData, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  });

  if (verifyError || !verifyData.session) {
    throw new Error(verifyError?.message || 'Não foi possível validar sessão de impersonation');
  }

  return verifyData.session;
}

export async function applySupabaseSession(
  session: Pick<Session, 'access_token' | 'refresh_token'>
): Promise<void> {
  const supabase = await createRouteHandlerSupabaseClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) {
    throw new Error(error.message || 'Erro ao aplicar sessão');
  }
}

export async function clearSupabaseSession(): Promise<void> {
  const supabase = await createRouteHandlerSupabaseClient();
  await supabase.auth.signOut();
}
