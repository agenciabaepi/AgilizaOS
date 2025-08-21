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

    console.log(`🔔 WhatsApp: Tentando enviar mensagem para ${numero}`);

    // Verificar se estamos no Vercel
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      console.log('⚠️ WhatsApp: Ambiente Vercel detectado - simulando envio');
      
      // Verificar se há sessão ativa
      const { data: session, error: sessionError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('empresa_id', empresa_id)
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Sessão WhatsApp não encontrada' },
          { status: 404 }
        );
      }

      if (session.status !== 'connected') {
        return NextResponse.json(
          { error: 'WhatsApp não está conectado' },
          { status: 400 }
        );
      }

      // Simular envio bem-sucedido
      console.log(`✅ WhatsApp: Mensagem simulada enviada para ${numero}`);
      
      // Salvar mensagem no banco (opcional)
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
        console.warn('⚠️ WhatsApp: Erro ao salvar mensagem no banco:', messageError);
      }

      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso (simulado)',
        numero_destino: numero,
        is_simulated: true,
        timestamp: new Date().toISOString()
      });
    }

    // Para ambiente não-Vercel, retornar erro
    return NextResponse.json({
      success: false,
      message: 'WhatsApp não disponível neste ambiente'
    });

  } catch (error) {
    console.error('❌ WhatsApp: Erro ao enviar mensagem:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
