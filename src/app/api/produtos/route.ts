import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  console.log('Dados recebidos no POST /api/produtos:', body);

  const {
    nome,
    tipo,
    unidade,
    custo,
    preco,
    estoque_atual,
    peso_g,
    altura_cm,
    largura_cm,
    profundidade_cm,
    ativo,
    codigo_barras,
    empresa_id,
    fornecedor,
    grupo,
    categoria,
    subcategoria,
    marca,
    estoque_min,
    estoque_max,
    situacao,
    ncm,
    cfop,
    cst,
    cest,
    obs
  } = body;

  if (!empresa_id || !nome || !tipo) {
    return NextResponse.json({ message: 'Campos obrigatórios ausentes.' }, { status: 400 });
  }

  const { data: ultimo, error: erroUltimo } = await supabase
    .from('produtos_servicos')
    .select('codigo')
    .eq('empresa_id', empresa_id)
    .order('codigo', { ascending: false })
    .limit(1)
    .single();

  if (erroUltimo && erroUltimo.code !== 'PGRST116') {
    console.error('Erro ao buscar último código:', erroUltimo);
    return NextResponse.json({
      message: 'Erro ao buscar último código.',
      error: erroUltimo.message || erroUltimo.details || erroUltimo,
    }, { status: 500 });
  }

  const ultimoCodigoNumerico = parseInt(ultimo?.codigo || '0', 10);
  const novoCodigo = ultimoCodigoNumerico + 1; // Gera código sequencial exclusivo por empresa

  const { data, error } = await supabase
    .from('produtos_servicos')
    .insert([
      {
        nome,
        tipo,
        unidade,
        custo,
        preco,
        estoque_atual,
        peso_g,
        altura_cm,
        largura_cm,
        profundidade_cm,
        ativo,
        codigo_barras,
        empresa_id,
        fornecedor,
        grupo,
        categoria,
        subcategoria,
        marca,
        estoque_min,
        estoque_max,
        situacao,
        ncm,
        cfop,
        cst,
        cest,
        obs,
        codigo: novoCodigo
      },
    ]);

  if (error) {
    console.error('Erro ao inserir produto:', error);
    return NextResponse.json({
      message: 'Erro ao inserir produto.',
      error: error.message || error.details || error,
    }, { status: 500 });
  }

  return NextResponse.json({ message: 'Produto inserido com sucesso!', data }, { status: 200 });
}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const empresa_id = searchParams.get('empresa_id');

  if (!empresa_id) {
    return NextResponse.json({ message: 'empresa_id é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('produtos_servicos')
    .select('codigo')
    .eq('empresa_id', empresa_id)
    .order('codigo', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ message: 'Erro ao buscar último código', error: error.message }, { status: 500 });
  }

  const ultimoCodigo = data?.codigo || 0;
  return NextResponse.json({ ultimoCodigo });
}