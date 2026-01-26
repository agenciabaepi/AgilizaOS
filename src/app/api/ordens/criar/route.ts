import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { sendNewOSNotification } from '@/lib/whatsapp-notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.cliente_id || !body.empresa_id) {
      return NextResponse.json(
        { error: 'Cliente e empresa são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Preparar dados para inserção
    const dadosOS: any = {
      cliente_id: body.cliente_id,
      empresa_id: body.empresa_id,
      tecnico_id: body.tecnico_id || null,
      status: body.status || 'ORÇAMENTO',
      status_tecnico: body.status_tecnico || null,
      equipamento: body.equipamento || null,
      categoria: body.categoria || null,
      marca: body.marca || null,
      modelo: body.modelo || null,
      cor: body.cor || null,
      numero_serie: body.numero_serie || null,
      problema_relatado: body.problema_relatado || null,
      observacao: body.observacao || null,
      atendente: body.atendente || null,
      tecnico: body.tecnico || null,
      acessorios: body.acessorios || null,
      condicoes_equipamento: body.condicoes_equipamento || null,
      data_cadastro: body.data_cadastro || new Date().toISOString(),
      os_garantia_id: body.os_garantia_id || null,
      termo_garantia_id: body.termo_garantia_id || null,
      tipo: body.tipo || 'Normal',
      senha_aparelho: body.senha_aparelho || null,
      senha_padrao: body.senha_padrao || null,
      checklist_entrada: body.checklist_entrada || null,
      prazo_entrega: body.prazo_entrega || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Inserir a OS (o trigger vai gerar o numero_os automaticamente)
    const { data: ordemCriada, error: insertError } = await supabase
      .from('ordens_servico')
      .insert(dadosOS)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao criar OS:', insertError);
      return NextResponse.json(
        { error: 'Erro ao criar OS: ' + insertError.message },
        { status: 500 }
      );
    }

    // Enviar notificação WhatsApp se necessário (já desativadas por padrão)
    try {
      await sendNewOSNotification(ordemCriada.id);
    } catch (notifError) {
      console.warn('⚠️ Erro ao enviar notificação WhatsApp (não crítico):', notifError);
    }

    return NextResponse.json({
      success: true,
      data: ordemCriada,
      message: 'OS criada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro interno ao criar OS:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido') },
      { status: 500 }
    );
  }
}
