import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  try {
    const osId = '64bdea43-ebb8-4044-85b5-b45c6da1df4a';
    
    console.log('🧪 TESTE SIMPLES: Iniciando teste para OS:', osId);

    // 1. Buscar dados da OS
    const supabase = createAdminClient();
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        cliente_id,
        tecnico_id,
        status,
        status_tecnico,
        servico,
        clientes!inner(nome, telefone)
      `)
      .eq('id', osId)
      .single();

    if (osError) {
      console.error('❌ TESTE SIMPLES: Erro ao buscar OS:', osError);
      return NextResponse.json({ 
        error: 'Erro ao buscar OS', 
        details: osError,
        step: 'buscar_os'
      }, { status: 500 });
    }

    console.log('✅ TESTE SIMPLES: OS encontrada:', {
      id: osData.id,
      numero_os: osData.numero_os,
      tecnico_id: osData.tecnico_id,
      cliente_nome: (osData.clientes as any)?.nome,
      cliente_telefone: (osData.clientes as any)?.telefone
    });

    // 2. Buscar dados do técnico
    const { data: tecnicoData, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, nome, telefone, email')
      .eq('id', osData.tecnico_id)
      .eq('nivel', 'tecnico')
      .single();

    if (tecnicoError) {
      console.error('❌ TESTE SIMPLES: Erro ao buscar técnico:', tecnicoError);
      return NextResponse.json({ 
        error: 'Erro ao buscar técnico', 
        details: tecnicoError,
        step: 'buscar_tecnico',
        osData: {
          id: osData.id,
          numero_os: osData.numero_os,
          tecnico_id: osData.tecnico_id
        }
      }, { status: 500 });
    }

    console.log('✅ TESTE SIMPLES: Técnico encontrado:', {
      id: tecnicoData.id,
      nome: tecnicoData.nome,
      telefone: tecnicoData.telefone,
      email: tecnicoData.email
    });

    // 3. Verificar se o técnico tem telefone
    if (!tecnicoData.telefone) {
      console.error('❌ TESTE SIMPLES: Técnico não possui telefone cadastrado');
      return NextResponse.json({ 
        error: 'Técnico não possui telefone cadastrado',
        step: 'verificar_telefone',
        tecnico: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          telefone: tecnicoData.telefone
        }
      }, { status: 400 });
    }

    console.log('✅ TESTE SIMPLES: Técnico tem telefone:', tecnicoData.telefone);

    // 4. Verificar variáveis de ambiente
    const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    console.log('🔍 TESTE SIMPLES: Variáveis de ambiente:', {
      WHATSAPP_ACCESS_TOKEN: WHATSAPP_ACCESS_TOKEN ? 'Configured' : 'NOT CONFIGURED',
      WHATSAPP_PHONE_NUMBER_ID: WHATSAPP_PHONE_NUMBER_ID ? 'Configured' : 'NOT CONFIGURED'
    });

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ TESTE SIMPLES: Variáveis de ambiente não configuradas');
      return NextResponse.json({ 
        error: 'Variáveis de ambiente não configuradas',
        step: 'verificar_env_vars',
        envVars: {
          WHATSAPP_ACCESS_TOKEN: WHATSAPP_ACCESS_TOKEN ? 'Configured' : 'NOT CONFIGURED',
          WHATSAPP_PHONE_NUMBER_ID: WHATSAPP_PHONE_NUMBER_ID ? 'Configured' : 'NOT CONFIGURED'
        }
      }, { status: 500 });
    }

    console.log('✅ TESTE SIMPLES: Todas as verificações passaram!');

    return NextResponse.json({
      success: true,
      message: 'Teste simples executado com sucesso!',
      osData: {
        id: osData.id,
        numero_os: osData.numero_os,
        cliente_nome: (osData.clientes as any)?.nome
      },
      tecnicoData: {
        id: tecnicoData.id,
        nome: tecnicoData.nome,
        telefone: tecnicoData.telefone
      },
      envVars: {
        WHATSAPP_ACCESS_TOKEN: 'Configured',
        WHATSAPP_PHONE_NUMBER_ID: 'Configured'
      }
    });

  } catch (error: any) {
    console.error('❌ TESTE SIMPLES: Erro interno:', error);
    return NextResponse.json({ 
      error: 'Erro interno no teste simples', 
      details: error.message,
      step: 'erro_interno'
    }, { status: 500 });
  }
}
