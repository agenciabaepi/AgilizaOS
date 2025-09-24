import { NextRequest, NextResponse } from 'next/server';
import { notificarNovaOSN8N, gerarURLOs, formatarWhatsApp } from '@/lib/n8n-nova-os';

export async function POST(request: NextRequest) {
  try {
    const { numero_os, cliente_nome, equipamento, defeito, status, tecnico_nome, tecnico_whatsapp } = await request.json();

    // Dados de teste se não fornecidos
    const testPayload = {
      numero_os: numero_os || 995,
      cliente_nome: cliente_nome || 'Lucas Oliveira',
      equipamento: equipamento || 'iPhone 14',
      defeito: defeito || 'Face ID não funciona',
      status: status || 'Orçamento',
      tecnico_nome: tecnico_nome || 'Pedro',
      tecnico_whatsapp: formatarWhatsApp(tecnico_whatsapp || '12988353971'),
      link_os: gerarURLOs(numero_os || '995')
    };

    console.log('🧪 N8N: Testando webhook novo-aparelho com payload:', testPayload);

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

