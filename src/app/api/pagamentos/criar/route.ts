import { NextRequest, NextResponse } from 'next/server';
import { configureMercadoPago } from '@/lib/mercadopago';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { valor, ordemServicoId, descricao } = await request.json();
    
    // Validar dados
    if (!valor || valor <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      );
    }

    // Configurar Mercado Pago
    const { config, Preference } = configureMercadoPago();
    
    // Criar preferência de pagamento
    const preference = new Preference(config);
    
    // Determinar URLs baseado no ambiente
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://www.consert.app';
    
    console.log(`Criando preferência para ambiente: ${isDevelopment ? 'development' : 'production'}`);
    console.log(`URL base: ${baseUrl}`);
    
    const preferenceData = {
      items: [
        {
          title: descricao || 'Pagamento Consert',
          unit_price: parseFloat(valor),
          quantity: 1,
        },
      ],
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'bank_transfer' },
        ],
        installments: 1,
      },
      back_urls: {
        success: `${baseUrl}/pagamentos/sucesso`,
        failure: `${baseUrl}/pagamentos/falha`,
        pending: `${baseUrl}/pagamentos/pendente`,
      },
      auto_return: 'approved',
      external_reference: ordemServicoId || `pagamento_${Date.now()}`,
      notification_url: `${baseUrl}/api/pagamentos/webhook`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    };

    const response = await preference.create({ body: preferenceData });
    
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
    
    // Salvar no banco de dados
    console.log('🔍 Iniciando busca do usuário...');
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
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
      mercadopago_preference_id: response.body.id,
      mercadopago_external_reference: preferenceData.external_reference,
    });
    
    const { data: pagamento, error: dbError } = await supabase
      .from('pagamentos')
      .insert({
        empresa_id: usuario.empresa_id,
        usuario_id: user.id,
        ordem_servico_id: ordemServicoId,
        valor: valor,
        mercadopago_preference_id: response.id,
        mercadopago_external_reference: preferenceData.external_reference,
        status: 'pending',
        status_detail: 'pending_waiting_payment',
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Erro ao salvar pagamento:', dbError);
      return NextResponse.json(
        { error: 'Erro ao salvar pagamento' },
        { status: 500 }
      );
    }
    
    console.log('✅ Pagamento salvo com sucesso:', pagamento);

    return NextResponse.json({
      success: true,
      preference_id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      pagamento_id: pagamento.id,
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
    
    return NextResponse.json(
      { error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
} 