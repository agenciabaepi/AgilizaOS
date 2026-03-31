import { NextRequest, NextResponse } from 'next/server';
import { getUsuarioByWhatsApp, getUserDataByLevel } from '@/lib/user-data';

/**
 * Endpoint de DEBUG para verificar dados do usuário
 * GET /api/webhook/check-user?whatsapp=5511999999999
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const whatsapp = searchParams.get('whatsapp');

    if (!whatsapp) {
      return NextResponse.json({
        error: 'Parâmetro obrigatório: whatsapp',
        exemplo: '/api/webhook/check-user?whatsapp=5511999999999'
      }, { status: 400 });
    }

    // Normalizar número
    const normalizedWhatsApp = whatsapp.replace(/\D/g, '');
    
    console.log('🔍 DEBUG: Buscando usuário:', normalizedWhatsApp);

    // Buscar usuário
    const usuario = await getUsuarioByWhatsApp(normalizedWhatsApp);

    if (!usuario) {
      return NextResponse.json({
        success: false,
        message: 'Usuário não encontrado',
        whatsapp: normalizedWhatsApp
      });
    }

    // Buscar dados do usuário
    let userData = null;
    try {
      userData = await getUserDataByLevel(usuario);
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
    }

    return NextResponse.json({
      success: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        nivel: usuario.nivel,
        empresa_id: usuario.empresa_id,
        whatsapp: usuario.whatsapp
      },
      temDados: !!userData,
      tipoDedados: userData?.nivel || null,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro no check-user:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.substring(0, 200)
    }, { status: 500 });
  }
}

