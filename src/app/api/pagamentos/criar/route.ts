import { NextRequest, NextResponse } from 'next/server';
import { configureMercadoPago } from '@/lib/mercadopago';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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
    
    const { valor, ordemServicoId, descricao } = await request.json();
    
    // Validar dados
    if (!valor || valor <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      );
    }

    // Configurar Mercado Pago
    console.log('🔍 Configurando Mercado Pago...');
    const { config } = configureMercadoPago();
    console.log('🔍 Mercado Pago configurado com sucesso');
    
    // Criar pagamento direto (não preferência)
    const payment = new Payment(config);
    
    // Determinar URLs baseado no ambiente
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://www.consert.app';
    
    console.log(`Criando preferência para ambiente: ${isDevelopment ? 'development' : 'production'}`);
    console.log(`URL base: ${baseUrl}`);
    
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
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Criar cliente com service role para bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('👤 Usuário encontrado:', user?.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Buscar empresa_id do usuário
    console.log('🏢 Buscando empresa do usuário...');
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    console.log('🏢 Usuário encontrado:', usuario);

    if (!usuario?.empresa_id) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 400 }
      );
    }

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

  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error('Mensagem de erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Verificar se é erro de configuração do Mercado Pago
    if (error instanceof Error && error.message.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      return NextResponse.json(
        { error: 'Configuração do Mercado Pago inválida' },
        { status: 500 }
      );
    }
    
    // Verificar se é erro de autenticação
    if (error instanceof Error && error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    
    // Verificar se é erro do Mercado Pago
    if (error instanceof Error && error.message.includes('mercadopago')) {
      return NextResponse.json(
        { error: `Erro do Mercado Pago: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
} 