import { NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase-config';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const tipo = searchParams.get('tipo'); // opcional: 'produto' | 'servico'

    // Segurança: exigir empresaId
    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }

    const filtros: string[] = [`empresa_id=eq.${empresaId}`];
    if (tipo) filtros.push(`tipo=eq.${tipo}`);

    const filt = filtros.length > 0 ? filtros.join('&') : '';
    const url = `${supabaseConfig.url}/rest/v1/produtos_servicos?select=*,grupos_produtos!grupo_id(nome)&${filt}&order=nome.asc`;
    
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


