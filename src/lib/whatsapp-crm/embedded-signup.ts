import { createAdminClient } from '@/lib/supabaseClient';
import { upsertEmpresaConfig, seedAutomacoesPadrao } from './conversations';

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function getAppCredentials() {
  const appId = process.env.WHATSAPP_APP_ID || process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      'WHATSAPP_APP_ID e WHATSAPP_APP_SECRET devem estar configurados no servidor (.env)'
    );
  }
  return { appId, appSecret };
}

/** Troca o code OAuth do Embedded Signup por business token (Meta) */
export async function exchangeEmbeddedSignupCode(code: string): Promise<string> {
  const { appId, appSecret } = getAppCredentials();

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Falha ao trocar code por access token');
  }

  return data.access_token as string;
}

/** Inscreve o app nos webhooks do WABA do cliente */
export async function subscribeWabaWebhooks(wabaId: string, accessToken: string) {
  const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Falha ao inscrever webhooks no WABA');
  }
  return data;
}

/** Registra número para Cloud API (se ainda não registrado) */
export async function registerPhoneNumber(phoneNumberId: string, accessToken: string) {
  const statusRes = await fetch(
    `${GRAPH_BASE}/${phoneNumberId}?fields=status,display_phone_number,verified_name,is_on_biz_app,platform_type`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const statusData = await statusRes.json();
  if (!statusRes.ok) {
    throw new Error(statusData.error?.message || 'Falha ao consultar número');
  }

  if (statusData.status === 'CONNECTED') {
    return statusData;
  }

  try {
    const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return { ...statusData, ...data };
    }
  } catch {
    // registro opcional — Embedded Signup pode já ter registrado
  }

  return statusData;
}

export interface CompleteEmbeddedSignupParams {
  empresaId: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessId?: string;
  connectionMode?: 'cloud_api' | 'coexistence';
}

/** Finaliza onboarding: token, webhooks, salvar config por empresa */
export async function completeEmbeddedSignup(params: CompleteEmbeddedSignupParams) {
  const accessToken = await exchangeEmbeddedSignupCode(params.code);

  await subscribeWabaWebhooks(params.wabaId, accessToken);

  const phoneDetails = await registerPhoneNumber(params.phoneNumberId, accessToken);

  const isCoexistence =
    params.connectionMode === 'coexistence' ||
    phoneDetails.is_on_biz_app === true;

  const supabase = createAdminClient();

  const config = await upsertEmpresaConfig(supabase, params.empresaId, {
    phone_number_id: params.phoneNumberId,
    business_account_id: params.wabaId,
    waba_id: params.wabaId,
    meta_business_id: params.businessId ?? null,
    access_token: accessToken,
    display_phone_number: phoneDetails.display_phone_number ?? null,
    ativo: true,
    webhook_verified: true,
    connection_mode: isCoexistence ? 'coexistence' : 'cloud_api',
    is_on_biz_app: isCoexistence,
    embedded_signup_at: new Date().toISOString(),
  } as Parameters<typeof upsertEmpresaConfig>[2]);

  await seedAutomacoesPadrao(supabase, params.empresaId);

  return {
    config,
    displayPhone: phoneDetails.display_phone_number as string | undefined,
    connectionMode: isCoexistence ? 'coexistence' : 'cloud_api',
  };
}
