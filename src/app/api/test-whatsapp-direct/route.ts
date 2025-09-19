import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import axios from 'axios';
import { formatPhoneNumber } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { osId } = await req.json();
    
    if (!osId) {
      return NextResponse.json({ 
        error: 'ID da OS é obrigatório' 
      }, { status: 400 });
    }

    console.log('🧪 TESTE DIRETO: Iniciando teste completo para OS:', osId);

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
        details: osError 
      }, { status: 500 });
    }

    console.log('✅ OS encontrada:', {
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
      console.error('❌ Erro ao buscar técnico:', tecnicoError);
      return NextResponse.json({ 
        error: 'Erro ao buscar técnico', 
        details: tecnicoError 
      }, { status: 500 });
    }

    console.log('✅ Técnico encontrado:', {
      id: tecnicoData.id,
      nome: tecnicoData.nome,
      telefone: tecnicoData.telefone,
      email: tecnicoData.email
    });

    // 3. Verificar se o técnico tem telefone
    if (!tecnicoData.telefone) {
      console.error('❌ Técnico não possui telefone cadastrado:', tecnicoData.nome);
      return NextResponse.json({ 
        error: 'Técnico não possui telefone cadastrado',
        tecnico: tecnicoData.nome
      }, { status: 400 });
    }

    // 4. Formatar número de telefone
    const formattedPhoneNumber = formatPhoneNumber(tecnicoData.telefone);
    if (!formattedPhoneNumber) {
      console.error('❌ Número de telefone inválido:', tecnicoData.telefone);
      return NextResponse.json({ 
        error: 'Número de telefone inválido',
        telefone: tecnicoData.telefone
      }, { status: 400 });
    }

    console.log('✅ Número formatado:', formattedPhoneNumber);

    // 5. Criar mensagem
    const clientName = (osData.clientes as any)?.nome || 'Não informado';
    const serviceDescription = osData.servico || 'Serviço não especificado';
    const message = `🎉 *OS APROVADA!*
📋 *OS #${osData.numero_os}*
👤 *Cliente:* ${clientName}
🔧 *Serviço:* ${serviceDescription}
✅ *Status:* Aprovado
A OS foi aprovada pelo cliente e está pronta para execução!
_Consert - Sistema de Gestão_`;

    console.log('✅ Mensagem criada:', message);

    // 6. Verificar variáveis de ambiente
    const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ Variáveis de ambiente do WhatsApp Cloud API não configuradas.');
      return NextResponse.json({ 
        error: 'Configuração do WhatsApp Cloud API incompleta',
        envVars: {
          WHATSAPP_ACCESS_TOKEN: WHATSAPP_ACCESS_TOKEN ? 'Configured' : 'NOT CONFIGURED',
          WHATSAPP_PHONE_NUMBER_ID: WHATSAPP_PHONE_NUMBER_ID ? 'Configured' : 'NOT CONFIGURED'
        }
      }, { status: 500 });
    }

    console.log('✅ Variáveis de ambiente configuradas');

    // 7. Enviar mensagem via WhatsApp Cloud API
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhoneNumber,
      type: 'text',
      text: { body: message },
    };

    const headers = {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    console.log('📱 Enviando mensagem WhatsApp:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, { headers });
    
    console.log('✅ WhatsApp API response:', response.data);

    return NextResponse.json({
      success: true,
      message: 'Teste direto executado com sucesso!',
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
      whatsappResponse: response.data
    });

  } catch (error: any) {
    console.error('❌ Erro no teste direto:', error);
    return NextResponse.json({ 
      error: 'Erro interno no teste direto', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
