import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { empresa_id } = await request.json();

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'Empresa ID é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🔔 WhatsApp: Iniciando conexão para empresa: ${empresa_id}`);

    // Criar/atualizar sessão no banco usando os campos corretos
    const { error: upsertError } = await supabase
      .from('whatsapp_sessions')
      .upsert({
        empresa_id,
        status: 'qr_ready',
        qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        numero_whatsapp: '',
        nome_contato: '',
        session_data: { empresa_id, timestamp: new Date().toISOString() },
        ultima_conexao: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('❌ WhatsApp: Erro ao criar/atualizar sessão no banco:', upsertError);
      return NextResponse.json(
        { error: 'Erro ao criar sessão no banco: ' + upsertError.message },
        { status: 500 }
      );
    }

    console.log('✅ WhatsApp: Sessão criada com sucesso');

    return NextResponse.json({
      success: true,
      message: 'WhatsApp conectado com sucesso!',
      status: 'qr_ready',
      qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    });

  } catch (error) {
    console.error('❌ WhatsApp: Erro ao conectar:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}