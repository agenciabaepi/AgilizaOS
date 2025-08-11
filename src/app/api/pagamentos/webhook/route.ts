import { NextRequest, NextResponse } from 'next/server';
import { configureMercadoPago } from '@/lib/mercadopago';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar se é uma notificação do Mercado Pago
    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data.id;
    
    // Configurar Mercado Pago
    const { config, Payment } = configureMercadoPago();
    
    // Buscar informações do pagamento
    const payment = await new Payment(config).get({ id: paymentId });
    
    if (!payment) {
      console.error('Pagamento não encontrado:', paymentId);
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // Salvar no banco de dados
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );
    
    // Buscar pagamento pelo mercadopago_payment_id (compatível com nosso schema)
    const { data: pagamento, error: fetchError } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('mercadopago_payment_id', String(paymentId))
      .single();

    if (fetchError || !pagamento) {
      console.error('Pagamento não encontrado no banco:', paymentId);
      return NextResponse.json({ error: 'Pagamento não encontrado no banco' }, { status: 404 });
    }

    // Atualizar status do pagamento
    const updateData: any = {
      mercadopago_payment_id: String(paymentId),
      status: payment.status as string,
      status_detail: (payment as any).status_detail,
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