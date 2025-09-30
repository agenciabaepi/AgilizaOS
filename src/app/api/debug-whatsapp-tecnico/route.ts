import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { sendOSStatusNotification } from '@/lib/whatsapp-notifications';

export async function POST(request: NextRequest) {
  try {
    const { osId, status } = await request.json();

    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🧪 DEBUG: Testando notificação WhatsApp para técnico:', { osId, status });

    const supabase = createAdminClient();

    // 1. Buscar dados da OS
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
      console.error('❌ Erro ao buscar OS:', osError);
      return NextResponse.json(
        { error: 'OS não encontrada', details: osError },
        { status: 404 }
      );
    }

    console.log('✅ OS encontrada:', {
      id: osData.id,
      numero_os: osData.numero_os,
      tecnico_id: osData.tecnico_id,
      cliente_nome: (osData.clientes as any)?.nome,
      cliente_telefone: (osData.clientes as any)?.telefone
    });

    // 2. Buscar dados do técnico - com logs detalhados
    console.log('🔍 DEBUG: Buscando técnico com ID:', osData.tecnico_id);
    
    // Primeiro, verificar se o técnico_id existe
    if (!osData.tecnico_id) {
      console.error('❌ OS não possui tecnico_id definido');
      return NextResponse.json(
        { error: 'OS não possui técnico atribuído' },
        { status: 400 }
      );
    }

    // Buscar técnico específico por auth_user_id
    let { data: tecnicoData, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, auth_user_id, nome, whatsapp, email, nivel')
      .eq('auth_user_id', osData.tecnico_id)  // ✅ Corrigido: usar auth_user_id
      .single();

    console.log('🔍 DEBUG: Resultado da busca específica:', {
      tecnicoData,
      tecnicoError,
      tecnicoId: osData.tecnico_id
    });

    // Se não encontrou o técnico específico, buscar qualquer técnico
    if (tecnicoError && tecnicoError.code === 'PGRST116') {
      console.log('⚠️ Técnico específico não encontrado, buscando qualquer técnico...');
      
      const { data: fallbackTecnico, error: fallbackError } = await supabase
        .from('usuarios')
        .select('id, nome, whatsapp, email, nivel')
        .eq('nivel', 'tecnico')
        .limit(1)
        .single();
      
      console.log('🔍 DEBUG: Resultado da busca fallback:', {
        fallbackTecnico,
        fallbackError
      });

      if (!fallbackError && fallbackTecnico) {
        tecnicoData = fallbackTecnico;
        tecnicoError = null;
        console.log('✅ Usando técnico fallback:', fallbackTecnico.nome);
      } else {
        console.error('❌ Nenhum técnico encontrado no sistema');
        return NextResponse.json(
          { error: 'Nenhum técnico encontrado no sistema', details: fallbackError },
          { status: 404 }
        );
      }
    }

    if (tecnicoError) {
      console.error('❌ Erro ao buscar técnico:', tecnicoError);
      return NextResponse.json(
        { error: 'Técnico não encontrado', details: tecnicoError },
        { status: 404 }
      );
    }

    console.log('✅ Técnico encontrado:', {
      id: tecnicoData.id,
      nome: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp,
      email: tecnicoData.email,
      nivel: tecnicoData.nivel
    });

    // 3. Listar todos os técnicos disponíveis para debug
    const { data: todosTecnicos, error: todosTecnicosError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, email, nivel')
      .eq('nivel', 'tecnico');
    
    console.log('🔍 DEBUG: Todos os técnicos no sistema:', {
      todosTecnicos,
      todosTecnicosError,
      total: todosTecnicos?.length || 0
    });

    // 3. Verificar se técnico tem WhatsApp
    if (!tecnicoData.whatsapp) {
      return NextResponse.json(
        { error: 'Técnico não possui WhatsApp cadastrado' },
        { status: 400 }
      );
    }

    // 4. Testar envio de notificação
    const testStatus = status || 'APROVADO';
    console.log('📱 Testando envio de notificação com status:', testStatus);
    
    const notificationResult = await sendOSStatusNotification(osId, testStatus);

    return NextResponse.json({
      success: true,
      message: 'Teste de notificação concluído',
      data: {
        os: {
          id: osData.id,
          numero_os: osData.numero_os,
          cliente_nome: (osData.clientes as any)?.nome,
          tecnico_id: osData.tecnico_id
        },
        tecnico: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp,
          email: tecnicoData.email,
          nivel: tecnicoData.nivel
        },
        todosTecnicos: todosTecnicos || [],
        notificationSent: notificationResult,
        testStatus: testStatus
      }
    });

  } catch (error) {
    console.error('❌ Erro no teste de notificação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}
