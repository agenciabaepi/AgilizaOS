import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getEmpresaIdForUser } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const cnpj = typeof body.cnpj === 'string' ? body.cnpj.trim() : '';
    const telefone = typeof body.telefone === 'string' ? body.telefone.trim() : '';
    const celular = typeof body.celular === 'string' ? body.celular.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const id = typeof body.id === 'string' ? body.id : null;

    if (!nome) {
      return NextResponse.json({ error: 'Nome do fornecedor é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (id) {
      const { data: existente } = await admin
        .from('fornecedores')
        .select('id, empresa_id')
        .eq('id', id)
        .maybeSingle();

      if (!existente || existente.empresa_id !== empresaId) {
        return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
      }

      const { data, error } = await admin
        .from('fornecedores')
        .update({
          nome,
          cnpj: cnpj || null,
          telefone: telefone || null,
          celular: celular || null,
          email: email || null,
        })
        .eq('id', id)
        .select('id, nome, cnpj, telefone, celular, email, ativo, created_at')
        .single();

      if (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        return NextResponse.json({ error: 'Erro ao atualizar fornecedor' }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const { data, error } = await admin
      .from('fornecedores')
      .insert({
        nome,
        cnpj: cnpj || null,
        telefone: telefone || null,
        celular: celular || null,
        email: email || null,
        empresa_id: empresaId,
        ativo: true,
      })
      .select('id, nome, cnpj, telefone, celular, email, ativo, created_at')
      .single();

    if (error) {
      console.error('Erro ao criar fornecedor:', error);
      return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/fornecedores/salvar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
