import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { email, empresa_id } = await req.json()

  // Se tiver empresa_id, filtra por empresa (para validação interna)
  // Se não tiver, verifica globalmente (para cadastro de nova empresa)
  let query = supabase
    .from('usuarios')
    .select('id')
    .eq('email', email.trim().toLowerCase());

  if (empresa_id) {
    query = query.eq('empresa_id', empresa_id);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({ exists: true })
}