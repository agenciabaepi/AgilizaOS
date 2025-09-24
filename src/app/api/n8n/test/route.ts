import { NextRequest, NextResponse } from 'next/server';
import { 
  notificarN8nOSAprovada, 
  notificarN8nNovaOS, 
  notificarN8nStatusOS 
} from '@/lib/n8n-integration';

/**
 * API de teste para integração N8N
 * Permite testar os webhooks do N8N com dados simulados
 */

export async function POST(request: NextRequest) {
  try {
    const { tipo, dados } = await request.json();

    if (!tipo || !dados) {
      return NextResponse.json(
        { error: 'Tipo e dados são obrigatórios' },
        { status: 400 }
      );
    }

    let resultado = false;
    let mensagem = '';

    switch (tipo) {
      case 'nova-os':
        resultado = await notificarN8nNovaOS({
          os_id: dados.os_id || 'test-os-123',
          empresa_id: dados.empresa_id || 'test-empresa',
          tecnico_nome: dados.tecnico_nome || 'João Silva',
          tecnico_whatsapp: dados.tecnico_whatsapp || '5511999999999',
          cliente_nome: dados.cliente_nome || 'Maria Santos',
          cliente_telefone: dados.cliente_telefone || '5511888888888',
          equipamento: dados.equipamento || 'iPhone 12',
          servico: dados.servico || 'Troca de tela',
          numero_os: dados.numero_os || 123,
          status: dados.status || 'Pendente',
          link_os: dados.link_os || 'https://gestaoconsert.com.br/ordens/test-os-123'
        });
        mensagem = resultado ? 'Nova OS enviada com sucesso' : 'Falha ao enviar nova OS';
        break;

      case 'os-aprovada':
        resultado = await notificarN8nOSAprovada({
          os_id: dados.os_id || 'test-os-123',
          status: 'APROVADO',
          empresa_id: dados.empresa_id || 'test-empresa',
          tecnico_nome: dados.tecnico_nome || 'João Silva',
          tecnico_whatsapp: dados.tecnico_whatsapp || '5511999999999',
          equipamento: dados.equipamento || 'iPhone 12',
          valor: dados.valor || 'R$ 250,00',
          link_os: dados.link_os || 'https://gestaoconsert.com.br/ordens/test-os-123',
          cliente_nome: dados.cliente_nome || 'Maria Santos',
          cliente_telefone: dados.cliente_telefone || '5511888888888',
          servico: dados.servico || 'Troca de tela',
          numero_os: dados.numero_os || 123
        });
        mensagem = resultado ? 'OS aprovada enviada com sucesso' : 'Falha ao enviar OS aprovada';
        break;

      case 'mudanca-status':
        resultado = await notificarN8nStatusOS({
          os_id: dados.os_id || 'test-os-123',
          status: dados.status || 'CONCLUÍDO',
          empresa_id: dados.empresa_id || 'test-empresa',
          tecnico_nome: dados.tecnico_nome || 'João Silva',
          tecnico_whatsapp: dados.tecnico_whatsapp || '5511999999999',
          equipamento: dados.equipamento || 'iPhone 12',
          valor: dados.valor || 'R$ 250,00',
          link_os: dados.link_os || 'https://gestaoconsert.com.br/ordens/test-os-123',
          cliente_nome: dados.cliente_nome || 'Maria Santos',
          cliente_telefone: dados.cliente_telefone || '5511888888888',
          servico: dados.servico || 'Troca de tela',
          numero_os: dados.numero_os || 123
        });
        mensagem = resultado ? 'Mudança de status enviada com sucesso' : 'Falha ao enviar mudança de status';
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo inválido. Use: nova-os, os-aprovada, mudanca-status' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: resultado,
      message: mensagem,
      tipo: tipo,
      dados_enviados: dados,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ N8N Test: Erro ao testar integração:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de teste N8N funcionando',
    endpoints: {
      'POST /api/n8n/test': 'Testar integração N8N',
    },
    tipos_suportados: [
      'nova-os',
      'os-aprovada', 
      'mudanca-status'
    ],
    exemplo_uso: {
      tipo: 'nova-os',
      dados: {
        os_id: 'test-123',
        empresa_id: 'empresa-456',
        tecnico_nome: 'João Silva',
        tecnico_whatsapp: '5511999999999',
        cliente_nome: 'Maria Santos',
        cliente_telefone: '5511888888888',
        equipamento: 'iPhone 12',
        servico: 'Troca de tela',
        numero_os: 123,
        status: 'Pendente'
      }
    },
    timestamp: new Date().toISOString()
  });
}

