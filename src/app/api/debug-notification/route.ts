import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { enviarMensagemWhatsAppMeta } from '@/lib/whatsapp-meta-envio';

export async function POST(req: NextRequest) {
  try {
    const { osId } = await req.json();
    
    if (!osId) {
      return NextResponse.json({ 
        error: 'ID da OS é obrigatório' 
      }, { status: 400 });
    }

    console.log('🔍 DEBUG: Iniciando debug para OS ID:', osId);

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
      console.error('❌ Erro ao buscar OS:', osError);
      return NextResponse.json({ 
        error: 'Erro ao buscar OS', 
        details: osError.message 
      }, { status: 500 });
    }

    console.log('✅ OS encontrada:', {
      id: osData.id,
      numero_os: osData.numero_os,
      tecnico_id: osData.tecnico_id,
      status: osData.status,
      cliente_nome: (osData.clientes as any)?.nome,
      cliente_telefone: (osData.clientes as any)?.telefone
    });

    // 2. Buscar dados do técnico
    if (!osData.tecnico_id) {
      console.log('⚠️ OS não tem técnico_id');
      return NextResponse.json({ 
        error: 'OS não tem técnico_id',
        osData: osData
      }, { status: 400 });
    }

    const { data: tecnicoData, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, nome, telefone, email')
      .eq('id', osData.tecnico_id)
      .eq('nivel', 'tecnico')
      .single();

    if (tecnicoError) {
      console.error('❌ Erro ao buscar técnico:', tecnicoError);
      return NextResponse.json({ 
        error: 'Erro ao buscar técnico', 
        details: tecnicoError.message,
        osData: osData
      }, { status: 500 });
    }

    console.log('✅ Técnico encontrado:', {
      id: tecnicoData.id,
      nome: tecnicoData.nome,
      telefone: tecnicoData.telefone,
      email: tecnicoData.email
    });

    // 3. Verificar variáveis de ambiente
    const envCheck = {
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? 'Configured' : 'NOT CONFIGURED',
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Configured' : 'NOT CONFIGURED',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT CONFIGURED'
    };

    console.log('🔧 Variáveis de ambiente:', envCheck);

    // 4. Testar envio de mensagem
    if (!tecnicoData.telefone) {
      console.log('⚠️ Técnico não tem telefone');
      return NextResponse.json({ 
        error: 'Técnico não tem telefone',
        osData: osData,
        tecnicoData: tecnicoData,
        envCheck: envCheck
      }, { status: 400 });
    }

    const messageBody = `🧪 *TESTE DE NOTIFICAÇÃO*
📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${(osData.clientes as any)?.nome || 'Não informado'}
🔧 *Serviço:* ${osData.servico || 'Serviço não especificado'}
✅ *Status:* Teste de notificação
Esta é uma mensagem de teste do sistema.
_Consert - Sistema de Gestão_`;

    console.log('📱 Tentando enviar mensagem para:', tecnicoData.telefone);
    console.log('📝 Mensagem:', messageBody);

    const envio = await enviarMensagemWhatsAppMeta({
      phoneNumber: tecnicoData.telefone,
      message: messageBody,
      useTemplate: false,
    });
    const result = envio.body;
    console.log('📱 Resposta do envio:', result);

    return NextResponse.json({
      success: true,
      message: 'Debug completo realizado',
      osData: osData,
      tecnicoData: tecnicoData,
      envCheck: envCheck,
      messageSent: result,
      responseStatus: envio.status
    });

  } catch (error: any) {
    console.error('❌ Erro no debug:', error);
    return NextResponse.json({ 
      error: 'Erro interno no debug', 
      details: error.message 
    }, { status: 500 });
  }
}
