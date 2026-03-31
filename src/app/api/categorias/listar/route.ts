import { NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase-config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    
    // Segurança: exigir empresaId
    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }
    
    const url = `${supabaseConfig.url}/rest/v1/categorias_produtos?select=id,nome,descricao,grupo_id,empresa_id,created_at&empresa_id=eq.${empresaId}&order=nome.asc`;
    
    const res = await fetch(url, {
      headers: {
        apikey: supabaseConfig.serviceRoleKey,
        Authorization: `Bearer ${supabaseConfig.serviceRoleKey}`,
        Accept: 'application/json'
      },
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}


