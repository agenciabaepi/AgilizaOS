import { NextRequest, NextResponse } from 'next/server';
import { notificarNovaOSN8N, gerarURLOs } from '@/lib/n8n-nova-os';
import { buildOSWebhookPayload } from '@/lib/sanitize-os-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Dados de teste se não fornecidos
    const testPayload = buildOSWebhookPayload({
      os_id: body.os_id || 'test-' + Date.now(),
      numero_os: body.numero_os || 995,
      cliente_nome: body.cliente_nome || 'Lucas Oliveira',
      cliente_telefone: body.cliente_telefone || '12999887766',
      equipamento: body.equipamento || body.aparelho || 'SMARTPHONE',
      modelo: body.modelo || 'iPhone 14',
      problema_relatado: body.problema_relatado || body.defeito || 'Face ID não funciona',
      servico: body.servico || 'Troca de Face ID',
      status: body.status || 'Orçamento',
      tecnico_nome: body.tecnico_nome || 'Pedro',
      tecnico_whatsapp: body.tecnico_whatsapp || '12988353971',
      link_os: gerarURLOs(body.os_id || 'test-995')
    });

    console.log('🧪 N8N: Testando webhook com payload:', testPayload);

    const success = await notificarNovaOSN8N(testPayload);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Teste enviado com sucesso para o webhook N8N',
        payload: testPayload
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao enviar teste para o webhook N8N',
          payload: testPayload
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Erro no teste do webhook N8N:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}

