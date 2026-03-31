import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { sendNewOSNotification } from '@/lib/whatsapp-notifications';
import { sendPushToTecnico, buildNovaOSPushMessage } from '@/lib/push-notification-tecnico';

function normalizeStatusText(value: unknown): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function parseMoneyLike(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
    const valorServico = parseMoneyLike(body.valor_servico);
    const valorPeca = parseMoneyLike(body.valor_peca);
    const valorFaturado = parseMoneyLike(body.valor_faturado);
    const temValorInicial = valorServico > 0 || valorPeca > 0 || valorFaturado > 0;
    let statusInicialOS =
      body.status !== undefined ? String(body.status).trim() : (temValorInicial ? 'APROVADO' : 'ORÇAMENTO');
    let statusInicialTecnico =
      body.status_tecnico !== undefined ? String(body.status_tecnico).trim() : 'AGUARDANDO INÍCIO';

    const statusOSNorm = normalizeStatusText(statusInicialOS);
    const statusTecNorm = normalizeStatusText(statusInicialTecnico);

    // Compatibilidade legada de entrada
    if (statusOSNorm === 'ABERTA') statusInicialOS = 'ORÇAMENTO';
    if (statusOSNorm === 'ORCAMENTO ENVIADO') statusInicialOS = 'ORÇAMENTO CONCLUÍDO';
    if (statusTecNorm === 'FINALIZADA') statusInicialTecnico = 'REPARO CONCLUÍDO';

    // Regra de criação: se técnico ainda está aguardando início, a OS não pode nascer como orçamento concluído/enviado.
    if (
      normalizeStatusText(statusInicialTecnico) === 'AGUARDANDO INICIO' &&
      ['ORCAMENTO CONCLUIDO', 'ORCAMENTO ENVIADO'].includes(normalizeStatusText(statusInicialOS))
    ) {
      statusInicialOS = temValorInicial ? 'APROVADO' : 'ORÇAMENTO';
    }

    // Preparar dados para inserção
    const dadosOS: any = {
      cliente_id: body.cliente_id,
      empresa_id: body.empresa_id,
      tecnico_id: body.tecnico_id || null,
      status: statusInicialOS,
      status_tecnico: statusInicialTecnico,
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

    // Enviar push para o técnico quando a O.S. é criada já com técnico atribuído
    const tecnicoId = ordemCriada?.tecnico_id ?? null;
    if (tecnicoId) {
      try {
        const { title, body } = buildNovaOSPushMessage(ordemCriada);
        const { sent } = await sendPushToTecnico(supabase, tecnicoId, {
          title,
          body,
          data: { os_id: ordemCriada.id },
        });
        if (sent > 0) {
          console.log('✅ Push enviada ao técnico, O.S.', ordemCriada.id, 'dispositivos:', sent);
        }
      } catch (pushError) {
        console.warn('⚠️ Erro ao enviar push ao técnico (não crítico):', pushError);
      }
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
