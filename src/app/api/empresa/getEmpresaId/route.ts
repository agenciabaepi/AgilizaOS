import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usuario_id = searchParams.get('usuario_id');

  if (!usuario_id) {
    return NextResponse.json({ error: 'ID do usuário inválido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', usuario_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ empresa_id: data.empresa_id });
}