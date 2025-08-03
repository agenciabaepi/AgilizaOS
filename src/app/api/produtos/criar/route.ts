import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('API Route - Variáveis de ambiente:', {
  supabaseUrl: supabaseUrl ? 'Definida' : 'Não definida',
  supabaseKey: supabaseKey ? 'Definida' : 'Não definida'
});

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente não definidas');
  throw new Error('Supabase URL or Service Role Key is not defined in environment');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  console.log('API Route /api/produtos/criar chamada');
  
  try {
    const {
      empresa_id,
      nome,
      tipo,
      preco,
      unidade,
      ativo
    } = await req.json();

    console.log('Dados recebidos na API de cadastro rápido:', {
      empresa_id, nome, tipo, preco, unidade, ativo
    });

    // Validate required fields
    if (!empresa_id || !nome || !tipo || !preco) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: empresa_id, nome, tipo ou preco' },
        { status: 400 }
      );
    }

    // Buscar próximo número sequencial
    const { data: maxResult } = await supabaseAdmin
      .from('produtos_servicos')
      .select('codigo')
      .eq('empresa_id', empresa_id)
      .order('codigo', { ascending: false })
      .limit(1)
      .single();

    const proximoCodigo = maxResult?.codigo ? parseInt(maxResult.codigo) + 1 : 1;

    const payload = {
      empresa_id,
      nome,
      tipo,
      preco: parseFloat(preco),
      unidade: unidade || 'un',
      ativo: true, // Sempre ativo por padrão
      codigo: proximoCodigo.toString()
    };

    console.log('Payload para inserção:', payload);

    const { data, error } = await supabaseAdmin
      .from('produtos_servicos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting product/service:', error);
      return NextResponse.json(
        {
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        },
        { status: 500 }
      );
    }

    console.log('Produto/serviço criado com sucesso:', data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('General POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
} 