import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint para validar credenciais do WhatsApp e verificar permissões
 */
export async function GET(request: NextRequest) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    // 1. Verificar se variáveis estão configuradas
    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({
        valid: false,
        error: 'Variáveis de ambiente não configuradas',
        details: {
          WHATSAPP_PHONE_NUMBER_ID: !!phoneNumberId,
          WHATSAPP_ACCESS_TOKEN: !!accessToken,
        }
      }, { status: 400 });
    }

    console.log('🔍 Validando credenciais WhatsApp...');
    console.log('📱 Phone Number ID:', phoneNumberId);
    console.log('🔑 Token existe:', !!accessToken);
    console.log('📊 Business Account ID:', businessAccountId || 'Não configurado');

    // 2. Tentar buscar informações do Phone Number ID
    try {
      const phoneInfoUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,account_type`;
      const phoneInfoResponse = await fetch(phoneInfoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const phoneInfoData = await phoneInfoResponse.json();

      if (!phoneInfoResponse.ok) {
        console.error('❌ Erro ao buscar informações do Phone Number:', phoneInfoData);
        
        // Verificar tipo de erro
        const errorCode = phoneInfoData?.error?.code;
        const errorSubcode = phoneInfoData?.error?.error_subcode;
        
        if (errorCode === 100 && errorSubcode === 33) {
          return NextResponse.json({
            valid: false,
            error: 'Phone Number ID não existe ou não tem permissões',
            details: {
              phoneNumberId,
              errorCode,
              errorSubcode,
              message: phoneInfoData?.error?.message,
              suggestion: [
                '1. Verifique se o Phone Number ID está correto no Facebook Business Manager',
                '2. Verifique se o token tem permissões para este Phone Number ID',
                '3. Gere um novo token com as permissões corretas',
                '4. Verifique se o número está ativo e verificado no WhatsApp Business',
              ]
            }
          }, { status: 400 });
        }

        return NextResponse.json({
          valid: false,
          error: 'Erro ao validar Phone Number ID',
          details: phoneInfoData
        }, { status: phoneInfoResponse.status });
      }

      console.log('✅ Phone Number ID válido:', phoneInfoData);

      // 3. Tentar buscar informações da Business Account (se configurada)
      let businessAccountInfo = null;
      if (businessAccountId) {
        try {
          const businessUrl = `https://graph.facebook.com/v18.0/${businessAccountId}?fields=name,message_template_namespace`;
          const businessResponse = await fetch(businessUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (businessResponse.ok) {
            businessAccountInfo = await businessResponse.json();
            console.log('✅ Business Account válida:', businessAccountInfo);
          }
        } catch (error) {
          console.warn('⚠️ Não foi possível validar Business Account:', error);
        }
      }

      // 4. Verificar permissões do token
      try {
        const debugTokenUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
        const debugResponse = await fetch(debugTokenUrl);
        const debugData = await debugResponse.json();

        if (debugResponse.ok && debugData?.data) {
          console.log('✅ Token válido:', {
            app_id: debugData.data.app_id,
            type: debugData.data.type,
            expires_at: debugData.data.expires_at ? new Date(debugData.data.expires_at * 1000).toISOString() : 'Nunca expira',
            scopes: debugData.data.scopes || []
          });
        }
      } catch (error) {
        console.warn('⚠️ Não foi possível validar token:', error);
      }

      return NextResponse.json({
        valid: true,
        message: 'Credenciais válidas!',
        phoneNumber: {
          id: phoneNumberId,
          verified_name: phoneInfoData.verified_name,
          display_phone_number: phoneInfoData.display_phone_number,
          quality_rating: phoneInfoData.quality_rating,
          account_type: phoneInfoData.account_type,
        },
        businessAccount: businessAccountInfo,
        token: {
          exists: !!accessToken,
          length: accessToken?.length,
        }
      });

    } catch (error) {
      console.error('❌ Erro ao validar credenciais:', error);
      return NextResponse.json({
        valid: false,
        error: 'Erro ao validar credenciais',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro interno:', error);
    return NextResponse.json({
      valid: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}





