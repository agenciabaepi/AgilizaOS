import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function normalizarUsuario(usuario: string) {
  return usuario.trim().toLowerCase();
}

async function getAuthenticatedUser(request: Request) {
  const supabase = await createServerSupabaseClient();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return user;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) return user;

  return null;
}

/**
 * POST /api/verificar/usuario
 * Body: { usuario, excludeId?, excludeAuthUserId? }
 * Verifica disponibilidade global do nome de usuário (login).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const usuarioNormalizado = normalizarUsuario(String(body.usuario ?? ''));

    if (!usuarioNormalizado) {
      return NextResponse.json({ exists: false, available: true });
    }

    const admin = getSupabaseAdmin();
    const authUser = await getAuthenticatedUser(req);

    let excludeId: string | undefined = body.excludeId;
    let excludeAuthUserId: string | undefined = body.excludeAuthUserId;

    if (authUser) {
      excludeAuthUserId = authUser.id;
      const { data: me } = await admin
        .from('usuarios')
        .select('id, usuario, auth_user_id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (me?.id) {
        excludeId = me.id;
        if (me.usuario && normalizarUsuario(me.usuario) === usuarioNormalizado) {
          return NextResponse.json({ exists: false, available: true });
        }
      }
    } else if (body.excludeId) {
      const { data: me } = await admin
        .from('usuarios')
        .select('id, usuario, auth_user_id')
        .eq('id', body.excludeId)
        .maybeSingle();

      if (me?.id) {
        excludeId = me.id;
        excludeAuthUserId = me.auth_user_id;
        if (me.usuario && normalizarUsuario(me.usuario) === usuarioNormalizado) {
          return NextResponse.json({ exists: false, available: true });
        }
      }
    }

    const { data: rows, error } = await admin
      .from('usuarios')
      .select('id, auth_user_id, usuario')
      .eq('usuario', usuarioNormalizado);

    if (error) {
      console.error('Erro ao verificar usuário:', error);
      return NextResponse.json({ exists: false, available: true });
    }

    const conflito = (rows ?? []).find((row) => {
      if (excludeId && row.id === excludeId) return false;
      if (excludeAuthUserId && row.auth_user_id === excludeAuthUserId) return false;
      return normalizarUsuario(row.usuario ?? '') === usuarioNormalizado;
    });

    return NextResponse.json({
      exists: !!conflito,
      available: !conflito,
    });
  } catch (error) {
    console.error('Erro POST /api/verificar/usuario:', error);
    return NextResponse.json({ exists: false, available: true });
  }
}
