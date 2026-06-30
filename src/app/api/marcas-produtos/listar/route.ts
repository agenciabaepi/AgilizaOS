import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type MarcaItem = { id: string; nome: string };

function mergeMarcas(catalog: MarcaItem[], fromProducts: string[]): MarcaItem[] {
  const map = new Map<string, MarcaItem>();

  for (const item of catalog) {
    const key = item.nome.trim().toLowerCase();
    if (key) map.set(key, { id: item.id, nome: item.nome.trim() });
  }

  for (const nome of fromProducts) {
    const trimmed = nome.trim();
    const key = trimmed.toLowerCase();
    if (key && !map.has(key)) {
      map.set(key, { id: trimmed, nome: trimmed });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: catalog, error: catalogError } = await admin
      .from('marcas_produtos')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    const catalogItems: MarcaItem[] = catalogError ? [] : (catalog ?? []);

    const { data: produtos, error: produtosError } = await admin
      .from('produtos_servicos')
      .select('marca')
      .eq('empresa_id', empresaId)
      .not('marca', 'is', null);

    if (produtosError) {
      console.error('Erro ao listar marcas de produtos:', produtosError);
      if (catalogError) {
        return NextResponse.json({ error: 'Erro ao buscar marcas' }, { status: 500 });
      }
    }

    const marcasProdutos = (produtos ?? [])
      .map((p) => (typeof p.marca === 'string' ? p.marca : ''))
      .filter(Boolean);

    return NextResponse.json(mergeMarcas(catalogItems, marcasProdutos));
  } catch (error) {
    console.error('GET /api/marcas-produtos/listar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
