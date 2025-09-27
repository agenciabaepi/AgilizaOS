import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 DEBUG VERCEL vs LOCALHOST - Iniciando diagnóstico...');

    const diagnostico = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NÃO DEFINIDO',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NÃO DEFINIDO',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
          `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'NÃO DEFINIDO',
      },
      headers: {
        userAgent: req.headers.get('user-agent'),
        origin: req.headers.get('origin'),
        host: req.headers.get('host'),
        referer: req.headers.get('referer'),
      },
      url: {
        baseUrl: req.nextUrl.origin,
        pathname: req.nextUrl.pathname,
        searchParams: Object.fromEntries(req.nextUrl.searchParams),
      }
    };

    // Teste de conexão básica com Supabase
    let supabaseTest = {
      connection: false,
      error: null as any,
      tablesAccessible: false,
      authWorking: false
    };

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Teste 1: Conexão básica
      const { data: healthCheck, error: healthError } = await supabase
        .from('empresas')
        .select('id')
        .limit(1);
      
      if (healthError) {
        supabaseTest.error = healthError.message;
      } else {
        supabaseTest.connection = true;
        supabaseTest.tablesAccessible = true;
      }

    } catch (error: any) {
      supabaseTest.error = error.message;
    }

    // Teste específico de salvar OS (simulado)
    let osSaveTest = {
      canInsert: false,
      error: null as any,
      serviceRoleWorking: false
    };

    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Tentar uma operação simples com service role
      const { data: testQuery, error: testError } = await adminClient
        .from('ordens_servico')
        .select('id')
        .limit(1);

      if (testError) {
        osSaveTest.error = testError.message;
      } else {
        osSaveTest.serviceRoleWorking = true;
        osSaveTest.canInsert = true;
      }

    } catch (error: any) {
      osSaveTest.error = error.message;
    }

    const resultado = {
      diagnostico,
      supabaseTest,
      osSaveTest,
      conclusao: {
        ambiente: process.env.VERCEL ? 'VERCEL' : 'LOCALHOST',
        problemas: [] as string[],
        solucoes: [] as string[]
      }
    };

    // Análise dos problemas
    if (!supabaseTest.connection) {
      resultado.conclusao.problemas.push('❌ Falha na conexão com Supabase');
      resultado.conclusao.solucoes.push('🔧 Verificar NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    if (!osSaveTest.serviceRoleWorking) {
      resultado.conclusao.problemas.push('❌ Service Role Key não funciona');
      resultado.conclusao.solucoes.push('🔧 Verificar SUPABASE_SERVICE_ROLE_KEY no Vercel');
    }

    if (process.env.VERCEL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      resultado.conclusao.problemas.push('❌ SUPABASE_SERVICE_ROLE_KEY não definida no Vercel');
      resultado.conclusao.solucoes.push('🔧 Adicionar variável de ambiente no painel do Vercel');
    }

    return NextResponse.json(resultado, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erro no diagnóstico:', error);
    
    return NextResponse.json({
      error: 'Erro no diagnóstico',
      message: error.message,
      stack: error.stack,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
      }
    }, { status: 500 });
  }
}
