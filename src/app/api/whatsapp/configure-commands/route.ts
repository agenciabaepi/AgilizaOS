import { NextRequest, NextResponse } from 'next/server';

/**
 * API para configurar comandos do WhatsApp via Conversational Components API
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers/conversational-components/#commands
 */
export async function POST(request: NextRequest) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Variáveis de ambiente do WhatsApp não configuradas' },
        { status: 500 }
      );
    }

    // Configurar comando /comissoes
    const commands = [
      {
        command_name: 'comissoes',
        command_description: 'Consultar suas comissões de técnico'
      }
    ];

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/conversational_automation`;
    
    const body = {
      commands: commands
    };

    console.log('📱 Configurando comandos WhatsApp:', JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao configurar comandos:', responseData);
      return NextResponse.json(
        { 
          error: 'Erro ao configurar comandos',
          details: responseData 
        },
        { status: response.status }
      );
    }

    console.log('✅ Comandos configurados com sucesso:', responseData);

    return NextResponse.json({
      success: true,
      message: 'Comando /comissoes configurado com sucesso',
      data: responseData
    });

  } catch (error: any) {
    console.error('❌ Erro interno ao configurar comandos:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao configurar comandos',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Visualizar comandos configurados
 */
export async function GET(request: NextRequest) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Variáveis de ambiente do WhatsApp não configuradas' },
        { status: 500 }
      );
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=conversational_automation`;

    console.log('📱 Buscando comandos configurados...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao buscar comandos:', responseData);
      return NextResponse.json(
        { 
          error: 'Erro ao buscar comandos',
          details: responseData 
        },
        { status: response.status }
      );
    }

    console.log('✅ Comandos encontrados:', responseData);

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('❌ Erro interno ao buscar comandos:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao buscar comandos',
        details: error.message 
      },
      { status: 500 }
    );
  }
}




