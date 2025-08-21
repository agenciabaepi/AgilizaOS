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

    console.log(`🔍 WhatsApp: Verificando status para empresa: ${empresa_id}`);

    // Buscar status da sessão no banco
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('empresa_id', empresa_id)
      .single();

    if (error) {
      console.error('❌ WhatsApp: Erro ao buscar sessão:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar sessão' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'Nenhuma sessão encontrada'
      });
    }

    console.log('✅ WhatsApp: Status recuperado:', data.status);

    return NextResponse.json({
      status: data.status,
      qr_code: data.qr_code,
      numero_whatsapp: data.numero_whatsapp,
      nome_contato: data.nome_contato,
      updated_at: data.updated_at
    });

  } catch (error) {
    console.error('❌ WhatsApp: Erro ao verificar status:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}
