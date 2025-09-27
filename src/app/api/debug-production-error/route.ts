import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Simular exatamente o que a API update-status faz
    const testData = {
      osId: '8faafbb3-1ac3-4704-a436-4b38bfac65ef',
      newStatus: 'ORÇAMENTO',
      newStatusTecnico: 'em atendimento',
      updateData: {
        status: 'ORÇAMENTO',
        status_tecnico: 'em atendimento',
        observacao: 'Teste de produção'
      }
    };

    console.log('🔍 TESTE PRODUÇÃO - Simulando update-status...');
    
    // Usar as mesmas configurações que a API real usa
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Variáveis de ambiente não configuradas',
        missing: {
          url: !supabaseUrl,
          serviceKey: !serviceKey
        }
      }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Teste 1: Buscar dados da OS (como a API real faz)
    console.log('📋 Buscando dados da OS...');
    const { data: osData, error: osError } = await adminClient
      .from('ordens_servico')
      .select('*')
      .eq('id', testData.osId)
      .single();

    if (osError) {
      return NextResponse.json({
        error: 'Erro ao buscar OS',
        supabaseError: osError,
        step: 'fetch_os_data'
      }, { status: 500 });
    }

    // Teste 2: Tentar atualizar (como a API real faz)
    console.log('💾 Tentando atualizar OS...');
    const { data: updateData, error: updateError } = await adminClient
      .from('ordens_servico')
      .update(testData.updateData)
      .eq('id', testData.osId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        error: 'Erro ao atualizar OS',
        supabaseError: updateError,
        step: 'update_os_data',
        originalData: osData,
        attemptedUpdate: testData.updateData
      }, { status: 500 });
    }

    // Se chegou até aqui, está funcionando!
    return NextResponse.json({
      success: true,
      message: 'Update funcionou perfeitamente!',
      originalData: osData,
      updatedData: updateData,
      environment: {
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: supabaseUrl.substring(0, 30) + '...',
        serviceKeyFormat: serviceKey.startsWith('sb_secret_') ? 'NEW_FORMAT' : 'OLD_FORMAT'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de produção:', error);
    
    return NextResponse.json({
      error: 'Erro inesperado no teste',
      message: error.message,
      stack: error.stack,
      name: error.name
    }, { status: 500 });
  }
}

// Endpoint POST para simular exatamente a chamada real
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🔍 POST TEST - Body recebido:', body);
    
    // Usar createAdminClient igual à API real
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Configuração Supabase incompleta',
        details: 'Variáveis de ambiente não encontradas'
      }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    
    // Tentar a mesma operação que falha na API real
    const { osId, updateData } = body;
    
    const { data, error } = await adminClient
      .from('ordens_servico')
      .update(updateData)
      .eq('id', osId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({
        error: 'Erro na atualização',
        supabaseError: error,
        requestBody: body
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Atualização realizada com sucesso!'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro no POST test',
      message: error.message
    }, { status: 500 });
  }
}
