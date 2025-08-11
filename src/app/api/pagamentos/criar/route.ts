import { NextRequest, NextResponse } from 'next/server';
import { configureMercadoPago } from '@/lib/mercadopago';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando criação de pagamento...');
    console.log('🔍 Variáveis de ambiente:', {
      MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Definida' : 'Não definida',
      MERCADOPAGO_ENVIRONMENT: process.env.MERCADOPAGO_ENVIRONMENT,
      NODE_ENV: process.env.NODE_ENV,
    });
    
    const { valor, ordemServicoId, descricao, mock } = await request.json();
    
    // Validar dados
    if (!valor || valor <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      );
    }

    // MODO MOCK: pular Mercado Pago e devolver dados simulados
    const shouldMock = mock === true || process.env.MERCADOPAGO_MOCK === '1';
    if (shouldMock) {
      console.log('🧪 MODO MOCK ATIVO - simulando criação de pagamento PIX');
      const fakePaymentId = `test_${Date.now()}`;
      const fakeQr = `00020126420014BR.GOV.BCB.PIX0125chave@consert.app5204000053039865404${String(
        Number(valor).toFixed(2)
      ).replace('.', '')}5802BR5909ConsertOS6009SaoPaulo62070503***6304ABCD`;

      // Em mock, permitimos simular sem estar autenticado; quando autenticado, tentamos gravar
      try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('auth_user_id', user.id)
            .single();
          if (usuario?.empresa_id) {
            await supabaseAdmin.from('pagamentos').insert({
              id: crypto.randomUUID(),
              empresa_id: usuario.empresa_id,
              usuario_id: user.id,
              ordem_servico_id: ordemServicoId,
              valor: valor,
              mercadopago_payment_id: fakePaymentId,
              status: 'pending',
              status_detail: 'pending_waiting_payment',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              webhook_received: false,
            });
          }
        }
      } catch (_) {}

      return NextResponse.json({
        success: true,
        payment_id: fakePaymentId,
        status: 'pending',
        pagamento_id: `mock_${Date.now()}`,
        qr_code: fakeQr,
        qr_code_base64: null,
      });
    }

    // Criar cliente Supabase (auth e admin) – obrigatório no fluxo real
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
        global: {
          headers: {
            Authorization: request.headers.get('authorization') || '',
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );
    console.log('👤 Usuário encontrado:', user?.id);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Buscar empresa do usuário
    console.log('🏢 Buscando empresa do usuário...');
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();
    console.log('🏢 Usuário encontrado:', usuario);
    if (!usuario?.empresa_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });
    }

    // Configurar Mercado Pago (modo real)
    console.log('🔍 Configurando Mercado Pago...');
    const { config } = configureMercadoPago();
    console.log('🔍 Mercado Pago configurado com sucesso');
    
    // Criar pagamento direto (não preferência)
    const payment = new Payment(config);
    
    // Determinar URL base dinamicamente (funciona em dev, preview e prod da Vercel)
    const currentUrl = new URL(request.url);
    const inferredHost = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      || currentUrl.origin;
    const baseUrl = inferredHost || 'http://localhost:3000';
    
    console.log(`URL base (dinâmica): ${baseUrl}`);
    
    const paymentData = {
      transaction_amount: parseFloat(valor),
      description: descricao || 'Pagamento Consert',
      payment_method_id: 'pix',
      external_reference: ordemServicoId || `pagamento_${Date.now()}`,
      notification_url: `${baseUrl}/api/pagamentos/webhook`,
      payer: {
        email: 'pagamento@consert.app',
        first_name: 'Pagamento',
        last_name: 'Consert',
      },
    };

    const response = await payment.create({ body: paymentData });
    
    console.log('Resposta do Mercado Pago:', JSON.stringify(response, null, 2));
    console.log('Response id:', response.id);
    
    // Verificar se response existe e tem id
    if (!response) {
      throw new Error('Resposta do Mercado Pago não existe');
    }
    
    if (!response.id) {
      throw new Error('Resposta do Mercado Pago não contém id');
    }
    
    console.log('✅ Response válido, continuando...');
    console.log('🔍 Response id:', response.id);
    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response point_of_interaction:', response.point_of_interaction);
    console.log('🔍 Response point_of_interaction?.transaction_data:', response.point_of_interaction?.transaction_data);
    console.log('🔍 Response point_of_interaction?.transaction_data?.qr_code:', response.point_of_interaction?.transaction_data?.qr_code);
    console.log('🔍 Response point_of_interaction?.transaction_data?.qr_code_base64:', response.point_of_interaction?.transaction_data?.qr_code_base64);
    
    // Salvar no banco de dados
    console.log('🔍 Iniciando busca do usuário...');
    // Inserir pagamento no banco
    console.log('💾 Inserindo pagamento no banco...');
    console.log('📊 Dados do pagamento:', {
      empresa_id: usuario.empresa_id,
      usuario_id: user.id,
      ordem_servico_id: ordemServicoId,
      valor: valor,
      mercadopago_payment_id: response.id,
    });
    
    const { data: pagamento, error: dbError } = await supabaseAdmin
      .from('pagamentos')
      .insert({
        id: crypto.randomUUID(), // Gerar UUID explicitamente
        empresa_id: usuario.empresa_id,
        usuario_id: user.id,
        ordem_servico_id: ordemServicoId,
        valor: valor,
        mercadopago_payment_id: response.id,
        status: 'pending',
        status_detail: 'pending_waiting_payment',
        // Persistir dados do QR para auditoria/visualização
        pix_qr_code: response.point_of_interaction?.transaction_data?.qr_code || null,
        pix_qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        // Timestamps explícitos (caso o default não esteja configurado no banco)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_received: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Erro ao salvar pagamento:', dbError);
      console.error('❌ Código do erro:', dbError.code);
      console.error('❌ Mensagem do erro:', dbError.message);
      console.error('❌ Detalhes do erro:', dbError.details);
      console.error('❌ Hint do erro:', dbError.hint);
      return NextResponse.json(
        { error: 'Erro ao salvar pagamento' },
        { status: 500 }
      );
    }
    
        console.log('✅ Pagamento salvo com sucesso:', pagamento);
    console.log('🔍 Retornando resposta...');
    console.log('🔍 payment_id:', response.id);
    console.log('🔍 status:', response.status);
    
    // Verificar se temos QR Code do Mercado Pago
    const qrCode = response.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = response.point_of_interaction?.transaction_data?.qr_code_base64;
    
    console.log('🔍 QR Code disponível:', !!qrCode);
    console.log('🔍 QR Code Base64 disponível:', !!qrCodeBase64);

    return NextResponse.json({
      success: true,
      payment_id: response.id,
      status: response.status,
      pagamento_id: pagamento.id,
      // Dados do QR Code do Mercado Pago
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
    });

  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error);
    try { console.error('Erro (json):', JSON.stringify(error)); } catch {}

    // Config ausente
    if (error instanceof Error && error.message.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      return NextResponse.json({ code: 'CONFIG_MISSING', error: 'Configuração do Mercado Pago inválida' }, { status: 500 });
    }

    // Auth ausente
    if (error instanceof Error && (error.message.includes('autenticado') || error.message.includes('Unauthorized'))) {
      return NextResponse.json({ code: 'UNAUTHENTICATED', error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Erro retornado pelo SDK do Mercado Pago
    if (error?.error || error?.cause || error?.status) {
      return NextResponse.json({
        code: 'MP_ERROR',
        error: error?.message || 'Erro do Mercado Pago',
        status: error?.status,
        cause: error?.cause,
        details: error?.error,
      }, { status: 500 });
    }

    // Fallback genérico
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ code: 'UNKNOWN', error: `Erro interno do servidor: ${message}` }, { status: 500 });
  }
} 