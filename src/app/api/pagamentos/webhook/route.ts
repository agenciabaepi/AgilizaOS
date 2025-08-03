import { NextRequest, NextResponse } from 'next/server';
import { configureMercadoPago } from '@/lib/mercadopago';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar se é uma notificação do Mercado Pago
    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data.id;
    
    // Configurar Mercado Pago
    const mercadopago = configureMercadoPago();
    
    // Buscar informações do pagamento
    const payment = await mercadopago.payment.findById(paymentId);
    
    if (!payment) {
      console.error('Pagamento não encontrado:', paymentId);
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // Salvar no banco de dados
    const supabase = createClient();
    
    // Buscar pagamento pelo external_reference
    const { data: pagamento, error: fetchError } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('mercadopago_external_reference', payment.external_reference)
      .single();

    if (fetchError || !pagamento) {
      console.error('Pagamento não encontrado no banco:', payment.external_reference);
      return NextResponse.json({ error: 'Pagamento não encontrado no banco' }, { status: 404 });
    }

    // Atualizar status do pagamento
    const updateData: any = {
      mercadopago_payment_id: paymentId.toString(),
      status: payment.status,
      status_detail: payment.status_detail,
      webhook_received: true,
      webhook_data: body,
      updated_at: new Date().toISOString(),
    };

    // Se foi aprovado, adicionar paid_at
    if (payment.status === 'approved') {
      updateData.paid_at = new Date().toISOString();
    }

    // Atualizar pagamento
    const { error: updateError } = await supabase
      .from('pagamentos')
      .update(updateData)
      .eq('id', pagamento.id);

    if (updateError) {
      console.error('Erro ao atualizar pagamento:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 });
    }

    console.log(`Pagamento ${paymentId} atualizado para status: ${payment.status}`);

    return NextResponse.json({ 
      received: true,
      payment_id: paymentId,
      status: payment.status 
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
} 