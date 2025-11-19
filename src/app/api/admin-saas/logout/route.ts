import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Remover cookies de acesso
    cookieStore.delete('admin_saas_access');
    cookieStore.delete('admin_saas_email');

    return NextResponse.json({
      ok: true,
      message: 'Logout realizado com sucesso',
      redirect: '/admin-login',
    });
  } catch (error: any) {
    console.error('❌ Erro ao fazer logout:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

