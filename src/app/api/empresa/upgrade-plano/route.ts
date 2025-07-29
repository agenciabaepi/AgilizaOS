import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { empresa_id, plano_id } = await request.json();

    if (!empresa_id || !plano_id) {
      return NextResponse.json({ error: 'empresa_id e plano_id são obrigatórios' }, { status: 400 });
    }

    console.log('Iniciando upgrade de plano:', { empresa_id, plano_id });

    // Buscar plano
    const { data: plano, error: errorPlano } = await supabaseAdmin
      .from('planos')
      .select('*')
      .eq('id', plano_id)
      .single();

    if (errorPlano || !plano) {
      console.error('Erro ao buscar plano:', errorPlano);
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    // Calcular data fim (30 dias para planos pagos)
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 30);

    const payload = {
      empresa_id,
      plano_id,
      status: 'active',
      data_inicio: dataInicio.toISOString(),
      data_fim: dataFim.toISOString(),
      data_trial_fim: null, // Para planos pagos, não há trial
      valor: plano.preco,
      gateway_pagamento: null,
      id_externo: null,
      observacoes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Payload para upgrade:', payload);

    const { data, error } = await supabaseAdmin
      .from('assinaturas')
      .insert(payload)
      .select();

    if (error) {
      console.error('Erro detalhado ao fazer upgrade:', error);
      return NextResponse.json({ 
        error: 'Erro ao fazer upgrade', 
        details: error 
      }, { status: 500 });
    }

    console.log('Assinatura criada com sucesso:', data);

    return NextResponse.json({
      success: true,
      message: 'Upgrade realizado com sucesso!',
      assinatura: data?.[0]
    });

  } catch (error) {
    console.error('Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 