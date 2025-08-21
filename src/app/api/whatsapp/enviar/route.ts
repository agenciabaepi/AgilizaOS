import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { empresa_id, numero, mensagem } = await request.json();

    if (!empresa_id || !numero || !mensagem) {
      return NextResponse.json(
        { error: 'Empresa ID, número e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`📱 WhatsApp: Enviando mensagem para ${numero} da empresa ${empresa_id}`);

    // Verificar se há uma sessão ativa
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('empresa_id', empresa_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Sessão WhatsApp não encontrada' },
        { status: 400 }
      );
    }

    if (session.status !== 'connected') {
      return NextResponse.json(
        { error: 'WhatsApp não está conectado' },
        { status: 400 }
      );
    }

    // Salvar mensagem no banco (simulação)
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        empresa_id,
        numero_destino: numero,
        mensagem,
        status: 'sent',
        is_simulated: true,
        created_at: new Date().toISOString()
      });

    if (messageError) {
      console.error('❌ WhatsApp: Erro ao salvar mensagem:', messageError);
      return NextResponse.json(
        { error: 'Erro ao salvar mensagem' },
        { status: 500 }
      );
    }

    console.log('✅ WhatsApp: Mensagem enviada com sucesso (simulada)');

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso!',
      message_id: Date.now(),
      is_simulated: true
    });

  } catch (error) {
    console.error('❌ WhatsApp: Erro ao enviar mensagem:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}
