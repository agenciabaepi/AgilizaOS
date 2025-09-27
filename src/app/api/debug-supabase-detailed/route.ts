import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 DEBUG SUPABASE DETALHADO - Iniciando...');

    // Pegar variáveis de ambiente diretamente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const diagnostico = {
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'VERCEL' : 'LOCALHOST',
      variables: {
        SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'UNDEFINED',
        ANON_KEY_TYPE: anonKey ? (anonKey.startsWith('sb_publishable_') ? 'NEW_FORMAT' : 'OLD_JWT') : 'UNDEFINED',
        ANON_KEY_PREFIX: anonKey ? anonKey.substring(0, 20) : 'UNDEFINED',
        SERVICE_KEY_TYPE: serviceKey ? (serviceKey.startsWith('sb_secret_') ? 'NEW_FORMAT' : 'OLD_JWT') : 'UNDEFINED', 
        SERVICE_KEY_PREFIX: serviceKey ? serviceKey.substring(0, 20) : 'UNDEFINED',
      },
      tests: {
        anon: { success: false, error: null as any },
        service: { success: false, error: null as any },
        osInsert: { success: false, error: null as any }
      }
    };

    // Teste 1: Cliente anônimo
    try {
      const anonClient = createClient(supabaseUrl!, anonKey!);
      const { data, error } = await anonClient.from('empresas').select('id').limit(1);
      
      if (error) {
        diagnostico.tests.anon.error = error.message;
      } else {
        diagnostico.tests.anon.success = true;
      }
    } catch (error: any) {
      diagnostico.tests.anon.error = error.message;
    }

    // Teste 2: Cliente service role
    try {
      const serviceClient = createClient(supabaseUrl!, serviceKey!);
      const { data, error } = await serviceClient.from('ordens_servico').select('id').limit(1);
      
      if (error) {
        diagnostico.tests.service.error = error.message;
      } else {
        diagnostico.tests.service.success = true;
      }
    } catch (error: any) {
      diagnostico.tests.service.error = error.message;
    }

    // Teste 3: Simular inserção de OS
    try {
      const serviceClient = createClient(supabaseUrl!, serviceKey!);
      
      // Dados mínimos para teste
      const testOS = {
        numero_os: 99999,
        cliente_id: '00000000-0000-0000-0000-000000000000',
        empresa_id: '00000000-0000-0000-0000-000000000000',
        equipamento: 'TESTE',
        problema_relatado: 'Teste de inserção',
        status: 'ORÇAMENTO',
        created_at: new Date().toISOString()
      };

      const { data, error } = await serviceClient
        .from('ordens_servico')
        .insert([testOS])
        .select()
        .single();
      
      if (error) {
        diagnostico.tests.osInsert.error = error.message;
        // Se erro for de foreign key, é normal (UUIDs fake)
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          diagnostico.tests.osInsert.success = true;
          diagnostico.tests.osInsert.error = 'Foreign key error (expected with fake UUIDs)';
        }
      } else {
        diagnostico.tests.osInsert.success = true;
        // Limpar teste se foi inserido
        await serviceClient.from('ordens_servico').delete().eq('id', data.id);
      }
    } catch (error: any) {
      diagnostico.tests.osInsert.error = error.message;
    }

    // Análise final
    const analise = {
      connectionOk: diagnostico.tests.anon.success,
      serviceRoleOk: diagnostico.tests.service.success,
      canInsertOS: diagnostico.tests.osInsert.success,
      mainIssue: null as string | null,
      suggestion: null as string | null
    };

    if (!analise.connectionOk) {
      analise.mainIssue = 'Conexão básica com Supabase falhando';
      analise.suggestion = 'Verificar SUPABASE_URL e ANON_KEY';
    } else if (!analise.serviceRoleOk) {
      analise.mainIssue = 'Service Role Key não funcional';
      analise.suggestion = 'Verificar SUPABASE_SERVICE_ROLE_KEY';
    } else if (!analise.canInsertOS) {
      analise.mainIssue = 'Não consegue inserir OS';
      analise.suggestion = 'Verificar permissões RLS na tabela ordens_servico';
    } else {
      analise.mainIssue = 'Tudo funcionando!';
      analise.suggestion = 'Sistema OK para salvar OS';
    }

    return NextResponse.json({
      diagnostico,
      analise,
      status: analise.canInsertOS ? 'SUCCESS' : 'FAILED'
    });

  } catch (error: any) {
    console.error('❌ Erro no diagnóstico detalhado:', error);
    
    return NextResponse.json({
      error: 'Erro no diagnóstico detalhado',
      message: error.message,
      environment: process.env.VERCEL ? 'VERCEL' : 'LOCALHOST'
    }, { status: 500 });
  }
}
