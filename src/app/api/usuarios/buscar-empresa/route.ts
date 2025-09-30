import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUserId = searchParams.get('authUserId');

    if (!authUserId) {
      return NextResponse.json({ error: 'authUserId é obrigatório' }, { status: 400 });
    }

    const response = await fetch(`${supabaseConfig.url}/rest/v1/usuarios?auth_user_id=eq.${authUserId}&select=empresa_id&limit=1`, {
      headers: {
        'apikey': supabaseConfig.serviceRoleKey,
        'Authorization': `Bearer ${supabaseConfig.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Erro na API Supabase:', response.status, response.statusText);
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 });
    }

    const data = await response.json();
    const usuarioData = data?.[0];
    
    if (!usuarioData?.empresa_id) {
      return NextResponse.json({ error: 'Empresa do usuário não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ empresa_id: usuarioData.empresa_id });
  } catch (error) {
    console.error('Erro na API buscar-empresa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
