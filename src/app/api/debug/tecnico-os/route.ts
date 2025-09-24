import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { os_id } = await request.json();
    
    if (!os_id) {
      return NextResponse.json(
        { error: 'os_id é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Buscar dados da OS
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        tecnico_id,
        marca,
        modelo,
        problema_relatado,
        status,
        clientes!inner(nome)
      `)
      .eq('id', os_id)
      .single();

    if (osError || !osData) {
      return NextResponse.json(
        { error: 'OS não encontrada', details: osError },
        { status: 404 }
      );
    }

    // Buscar dados do técnico
    let tecnico = null;
    let tecnicoError = null;

    if (osData.tecnico_id) {
      // Tentar buscar por ID primeiro
      const { data: tecnicoData, error: tecnicoErr } = await supabase
        .from('usuarios')
        .select('id, nome, whatsapp, tecnico_id')
        .eq('id', osData.tecnico_id)
        .single();

      if (!tecnicoErr && tecnicoData) {
        tecnico = tecnicoData;
      } else {
        // Fallback: buscar por tecnico_id
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('usuarios')
          .select('id, nome, whatsapp, tecnico_id')
          .eq('tecnico_id', osData.tecnico_id)
          .single();

        if (!fallbackErr && fallbackData) {
          tecnico = fallbackData;
        } else {
          tecnicoError = fallbackErr;
        }
      }
    }

    // Buscar todos os usuários para comparação
    const { data: allUsers, error: allUsersError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, tecnico_id')
      .limit(10);

    return NextResponse.json({
      success: true,
      os_data: osData,
      tecnico_encontrado: tecnico,
      tecnico_error: tecnicoError,
      all_users_sample: allUsers,
      debug_info: {
        os_tecnico_id: osData.tecnico_id,
        tecnico_buscado_por_id: !!tecnico,
        total_usuarios: allUsers?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Erro na API de debug:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
