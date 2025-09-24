import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Buscar estrutura da tabela ordens_servico (tentar RPC primeiro, depois fallback)
    let tableInfo = null;
    let tableError = null;
    
    try {
      const result = await supabase.rpc('get_table_columns', { table_name: 'ordens_servico' });
      tableInfo = result.data;
      tableError = result.error;
    } catch (rpcError) {
      // RPC não disponível, usar fallback
      console.log('RPC não disponível, usando fallback');
    }

    // Buscar uma OS existente para ver a estrutura real
    const { data: sampleOS, error: sampleError } = await supabase
      .from('ordens_servico')
      .select('*')
      .limit(1)
      .single();

    // Buscar estrutura da tabela usuarios
    const { data: usuariosSample, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      ordens_servico_structure: sampleOS ? Object.keys(sampleOS) : null,
      ordens_servico_sample: sampleOS,
      usuarios_structure: usuariosSample ? Object.keys(usuariosSample) : null,
      usuarios_sample: usuariosSample,
      errors: {
        ordens_servico: sampleError,
        usuarios: usuariosError
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura das tabelas:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao verificar estrutura das tabelas',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
