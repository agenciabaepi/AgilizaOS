import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const logs: string[] = [];
  
  function addLog(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    logs.push(logMessage);
    console.log(logMessage);
  }

  try {
    addLog('🔍 DEBUG LOGIN: Iniciando teste de conexão...');

    // 1. Verificar variáveis de ambiente
    addLog('🔑 PASSO 1: Verificando variáveis de ambiente...');
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    addLog(`🔑 SUPABASE_URL: ${SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
    addLog(`🔑 SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado'}`);
    addLog(`🔑 SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ Não configurado'}`);

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
      addLog('❌ VARIÁVEIS DE AMBIENTE FALTANDO');
      return NextResponse.json({
        success: false,
        message: 'Variáveis de ambiente do Supabase não configuradas',
        logs: logs
      }, { status: 500 });
    }

    // 2. Testar conexão com cliente admin
    addLog('🔗 PASSO 2: Testando conexão com Supabase...');
    const supabase = createAdminClient();
    
    // Testar consulta simples
    const { data: testData, error: testError } = await supabase
      .from('usuarios')
      .select('id, nome, email, usuario, nivel')
      .limit(5);

    if (testError) {
      addLog(`❌ ERRO na consulta de teste: ${JSON.stringify(testError)}`);
      return NextResponse.json({
        success: false,
        message: 'Erro ao conectar com Supabase',
        error: testError,
        logs: logs
      }, { status: 500 });
    }

    addLog(`✅ Conexão com Supabase OK! Encontrados ${testData?.length || 0} usuários`);

    // 3. Testar busca específica por usuário "wdglp"
    addLog('👤 PASSO 3: Testando busca por usuário "wdglp"...');
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nome, email, usuario, nivel, email_verificado, empresa_id')
      .eq('usuario', 'wdglp')
      .single();

    if (usuarioError) {
      addLog(`❌ ERRO ao buscar usuário "wdglp": ${JSON.stringify(usuarioError)}`);
      
      // Tentar buscar todos os usuários para debug
      addLog('🔍 Buscando todos os usuários para debug...');
      const { data: allUsers, error: allUsersError } = await supabase
        .from('usuarios')
        .select('id, nome, email, usuario, nivel')
        .limit(10);
      
      if (allUsersError) {
        addLog(`❌ ERRO ao buscar todos os usuários: ${JSON.stringify(allUsersError)}`);
      } else {
        addLog(`✅ Encontrados ${allUsers?.length || 0} usuários:`);
        allUsers?.forEach((user, index) => {
          addLog(`  ${index + 1}. ${user.usuario} (${user.email}) - ${user.nivel}`);
        });
      }
      
      return NextResponse.json({
        success: false,
        message: 'Usuário "wdglp" não encontrado',
        error: usuarioError,
        allUsers: allUsers || [],
        logs: logs
      }, { status: 404 });
    }

    addLog(`✅ Usuário "wdglp" encontrado: ${JSON.stringify(usuarioData)}`);

    // 4. Testar autenticação
    addLog('🔐 PASSO 4: Testando autenticação...');
    // Nota: Não podemos testar senha aqui por segurança, mas podemos verificar se o usuário existe

    return NextResponse.json({
      success: true,
      message: 'Debug de login executado com sucesso!',
      usuario: usuarioData,
      logs: logs
    });

  } catch (error: any) {
    addLog('❌ ERRO GERAL: ' + error.message);
    return NextResponse.json({ 
      success: false,
      error: 'Erro interno no debug de login', 
      details: error.message,
      logs: logs
    }, { status: 500 });
  }
}
