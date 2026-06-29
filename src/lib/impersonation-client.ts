import { supabase } from '@/lib/supabaseClient';

type SessionTokens = {
  access_token: string;
  refresh_token: string;
};

/** Aplica sessão no browser (localStorage) e nos cookies SSR após impersonation. */
export async function finalizeImpersonationLogin(
  session: SessionTokens,
  redirect: string
): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) {
    throw new Error(error.message || 'Não foi possível iniciar sessão no navegador');
  }

  const syncRes = await fetch('/api/auth/apply-session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  const syncJson = await syncRes.json().catch(() => ({}));
  if (!syncRes.ok || !syncJson.ok) {
    throw new Error(syncJson.error || 'Não foi possível sincronizar sessão com o servidor');
  }

  window.location.href = redirect;
}

/** Encerra sessão do usuário impersonado no browser e no servidor. */
export async function exitImpersonationClient(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
}
