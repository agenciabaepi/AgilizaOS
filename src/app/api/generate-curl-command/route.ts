import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const phoneNumber = request.nextUrl.searchParams.get('phone') || '12988353971';
    
    // Formatar número de telefone
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const phoneWithCountryCode = formattedPhone.startsWith('55') 
      ? formattedPhone 
      : `55${formattedPhone}`;

    const message = `🧪 *TESTE CURL COMANDO*

Este é um teste usando o comando curl exato que funciona.

Se você receber esta mensagem, significa que:
✅ O comando curl está correto
✅ A API WhatsApp está funcionando
✅ O problema é específico da aplicação

Número testado: ${phoneNumber}
Formatado: ${phoneWithCountryCode}

_Consert - Sistema de Gestão_`;

    const payload = {
      messaging_product: 'whatsapp',
      to: phoneWithCountryCode,
      type: 'text',
      text: { body: message }
    };

    const curlCommand = `curl -X POST \\
  'https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages' \\
  -H 'Authorization: Bearer EAATEn3qAZAgsBPZAywoZC5YhDqZChEupTUyJu02soeJrMMAGCEQWyKmnQao5InPQczxWZCuUvqPvCosRBZBp5XUbhPhl9ZAGlfZAsaVcuZBAWuLh5ALFcd8LxUKkRVr8ezjeJI4vNiTyK7Y5qb7hAHkwZBQuoCGe9Bo4kCYDMzbCxbiWNiQKER9zAm2W11kA0vUBY1MIxIkmXjtYgy6A6QfTSjNpELLdsUaOLMnK7A4aFX' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(payload)}'`;

    return NextResponse.json({
      success: true,
      curlCommand,
      payload,
      phoneNumber,
      formattedPhone: phoneWithCountryCode,
      message: 'Comando curl gerado com sucesso!',
      instructions: [
        '1. Copie o comando curl acima',
        '2. Cole no terminal e execute',
        '3. Verifique se a mensagem chega no WhatsApp',
        '4. Se chegar, o problema é da aplicação',
        '5. Se não chegar, há problema na configuração'
      ]
    });

  } catch (error) {
    console.error('❌ Erro ao gerar comando curl:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}
