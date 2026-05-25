import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Resolve nome de usuário → email para login.
 * Usa admin client para ignorar RLS na tabela usuarios.
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('usuarios')
      .select('email')
      .eq('usuario', username.trim().toLowerCase())
      .single();

    if (error || !data?.email) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
