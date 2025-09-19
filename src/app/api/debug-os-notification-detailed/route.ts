import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { osId } = await request.json();

    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    console.log('🔍 DEBUG DETALHADO: Iniciando debug da OS:', osId);

    const supabase = createAdminClient();

    // 1. Buscar dados da OS
    console.log('🔍 1. Buscando dados da OS...');
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .select(`
        *,
        clientes (
          id,
          nome,
          telefone,
          celular
        ),
        usuarios (
          id,
          nome,
          whatsapp,
          nivel
        )
      `)
      .eq('id', osId)
      .single();

    if (osError) {
      console.error('❌ Erro ao buscar OS:', osError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar OS',
        details: osError.message,
        step: 'buscar_os'
      });
    }

    console.log('✅ OS encontrada:', {
      id: osData.id,
      cliente: osData.clientes?.nome,
      tecnico: osData.usuarios?.nome,
      status: osData.status
    });

    // 2. Verificar se tem técnico responsável
    console.log('🔍 2. Verificando técnico responsável...');
    if (!osData.tecnico_id) {
      console.log('❌ OS sem técnico responsável');
      return NextResponse.json({
        success: false,
        error: 'OS sem técnico responsável',
        details: 'A OS não tem um técnico responsável definido',
        step: 'verificar_tecnico',
        osData: {
          id: osData.id,
          tecnico_id: osData.tecnico_id,
          cliente: osData.clientes?.nome
        }
      });
    }

    // 3. Buscar dados do técnico
    console.log('🔍 3. Buscando dados do técnico...');
    const { data: tecnicoData, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, nivel')
      .eq('auth_user_id', osData.tecnico_id)
      .maybeSingle();

    if (tecnicoError) {
      console.error('❌ Erro ao buscar técnico:', tecnicoError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar técnico',
        details: tecnicoError.message,
        step: 'buscar_tecnico',
        osData: {
          id: osData.id,
          tecnico_id: osData.tecnico_id
        }
      });
    }

    if (!tecnicoData) {
      console.log('❌ Técnico não encontrado na tabela usuarios');
      return NextResponse.json({
        success: false,
        error: 'Técnico não encontrado',
        details: `O técnico com ID ${osData.tecnico_id} não foi encontrado na tabela usuarios`,
        step: 'buscar_tecnico',
        osData: {
          id: osData.id,
          tecnico_id: osData.tecnico_id
        }
      });
    }

    console.log('✅ Técnico encontrado:', {
      id: tecnicoData.id,
      nome: tecnicoData.nome,
      whatsapp: tecnicoData.whatsapp,
      nivel: tecnicoData.nivel
    });

    // 4. Verificar se técnico tem WhatsApp
    console.log('🔍 4. Verificando WhatsApp do técnico...');
    if (!tecnicoData.whatsapp) {
      console.log('❌ Técnico sem WhatsApp');
      return NextResponse.json({
        success: false,
        error: 'Técnico sem WhatsApp',
        details: 'O técnico responsável não tem WhatsApp cadastrado',
        step: 'verificar_whatsapp',
        tecnicoData: {
          id: tecnicoData.id,
          nome: tecnicoData.nome,
          whatsapp: tecnicoData.whatsapp
        }
      });
    }

    // 5. Preparar dados para envio
    console.log('🔍 5. Preparando dados para envio...');
    const whatsappData = {
      osId: osData.id,
      clienteNome: osData.clientes?.nome || 'Cliente não informado',
      tecnicoNome: tecnicoData.nome,
      tecnicoWhatsapp: tecnicoData.whatsapp,
      status: 'aprovado',
      message: `🎉 *Nova atualização na OS!*\n\n📋 *OS:* ${osData.id.slice(0, 8)}...\n👤 *Cliente:* ${osData.clientes?.nome || 'Cliente não informado'}\n🔧 *Técnico:* ${tecnicoData.nome}\n✅ *Status:* Aprovado\n\n📱 *Consert - Sistema de Gestão*`
    };

    console.log('✅ Dados preparados:', whatsappData);

    // 6. Testar envio direto
    console.log('🔍 6. Testando envio direto...');
    try {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/whatsapp/send-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: tecnicoData.whatsapp,
          message: whatsappData.message
        }),
      });

      const result = await response.json();
      console.log('📱 Resultado do envio:', result);

      if (response.ok && result.success) {
        return NextResponse.json({
          success: true,
          message: 'Notificação enviada com sucesso!',
          step: 'envio_sucesso',
          whatsappData,
          sendResult: result
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Erro no envio da mensagem',
          details: result.error || 'Erro desconhecido',
          step: 'erro_envio',
          whatsappData,
          sendResult: result
        });
      }
    } catch (sendError) {
      console.error('❌ Erro no envio:', sendError);
      return NextResponse.json({
        success: false,
        error: 'Erro na comunicação com API WhatsApp',
        details: sendError.message,
        step: 'erro_comunicacao',
        whatsappData
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: error.message,
        step: 'erro_geral'
      },
      { status: 500 }
    );
  }
}
