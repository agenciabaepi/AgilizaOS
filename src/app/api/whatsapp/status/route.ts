import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa_id = searchParams.get('empresa_id');

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'Empresa ID é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🔔 WhatsApp: Verificando status para empresa: ${empresa_id}`);

    // Verificar se estamos no Vercel
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      console.log('⚠️ WhatsApp: Ambiente Vercel detectado - retornando status simulado');
      
      // Buscar sessão no banco
      const { data: session, error } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('empresa_id', empresa_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ WhatsApp: Erro ao buscar sessão:', error);
        return NextResponse.json(
          { error: 'Erro ao buscar sessão' },
          { status: 500 }
        );
      }

      if (!session) {
        return NextResponse.json({
          status: 'disconnected',
          message: 'Nenhuma sessão encontrada',
          is_simulated: true
        });
      }

      return NextResponse.json({
        status: session.status || 'disconnected',
        qr_code: session.qr_code,
        numero_whatsapp: session.numero_whatsapp,
        nome_contato: session.nome_contato,
        updated_at: session.updated_at,
        is_simulated: true,
        message: 'Status simulado (Vercel)'
      });
    }

    // Para ambiente não-Vercel, retornar status real
    return NextResponse.json({
      status: 'unavailable',
      message: 'WhatsApp não disponível neste ambiente'
    });

  } catch (error) {
    console.error('❌ WhatsApp: Erro ao verificar status:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
