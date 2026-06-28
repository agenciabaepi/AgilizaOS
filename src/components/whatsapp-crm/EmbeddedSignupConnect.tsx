'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { MessageCircle, Loader2, Smartphone } from 'lucide-react';

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string }; status?: string }) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface EmbeddedSignupConnectProps {
  onConnected: () => void;
}

interface SessionFinishData {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
  current_step?: string;
}

export function EmbeddedSignupConnect({ onConnected }: EmbeddedSignupConnectProps) {
  const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
  const configId = process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID;

  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<SessionFinishData>({});
  const codeRef = useRef<string | null>(null);

  const finalizeConnection = useCallback(async () => {
    const code = codeRef.current;
    const { phone_number_id, waba_id, business_id } = sessionRef.current;

    if (!code || !phone_number_id || !waba_id) {
      setError('Dados incompletos do Meta. Tente conectar novamente.');
      setConnecting(false);
      return;
    }

    try {
      const res = await fetch('/api/whatsapp/crm/embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          waba_id,
          phone_number_id,
          business_id,
          connection_mode: 'coexistence',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao finalizar conexão');
      }

      codeRef.current = null;
      sessionRef.current = {};
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  }, [onConnected]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }

      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (payload.event === 'FINISH' || payload.event === 'FINISH_ONLY_WABA') {
          sessionRef.current = {
            ...sessionRef.current,
            ...payload.data,
          };
          if (codeRef.current && sessionRef.current.phone_number_id && sessionRef.current.waba_id) {
            void finalizeConnection();
          }
        }

        if (payload.event === 'CANCEL') {
          setConnecting(false);
          setError('Conexão cancelada.');
        }

        if (payload.event === 'ERROR') {
          setConnecting(false);
          setError(payload.data?.error_message || 'Erro no fluxo Meta');
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [finalizeConnection]);

  useEffect(() => {
    if (!appId) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });
      setSdkReady(true);
    };

    if (window.FB) {
      window.fbAsyncInit?.();
    }
  }, [appId]);

  function launchSignup() {
    if (!sdkReady || !window.FB || !configId) return;

    setError(null);
    setConnecting(true);
    codeRef.current = null;
    sessionRef.current = {};

    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          codeRef.current = response.authResponse.code;
          if (sessionRef.current.phone_number_id && sessionRef.current.waba_id) {
            void finalizeConnection();
          }
        } else if (response.status !== 'unknown') {
          setConnecting(false);
          if (response.status === 'not_authorized') {
            setError('Permissões não concedidas. Autorize o acesso ao WhatsApp Business.');
          }
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      }
    );
  }

  if (!appId || !configId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Embedded Signup não configurado</p>
        <p className="mt-1 text-xs text-amber-800">
          Defina <code className="bg-white/80 px-1">NEXT_PUBLIC_WHATSAPP_APP_ID</code> e{' '}
          <code className="bg-white/80 px-1">NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID</code> no
          ambiente. Crie a configuração em Meta App Dashboard → WhatsApp → Embedded Signup Builder.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://connect.facebook.net/pt_BR/sdk.js"
        strategy="lazyOnload"
        onLoad={() => window.fbAsyncInit?.()}
      />

      <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Conectar meu WhatsApp</h3>
            <p className="text-sm text-gray-600 mt-1">
              Use o número que já está no <strong>WhatsApp Business</strong> da sua assistência.
              Você continua usando o app no celular — o Consert sincroniza conversas e automações
              de OS pela API oficial da Meta (
              <a
                href="https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:underline"
              >
                coexistência
              </a>
              ).
            </p>
          </div>
        </div>

        <ul className="text-xs text-gray-600 space-y-1 pl-1">
          <li>• App WhatsApp Business atualizado (v2.24.17+)</li>
          <li>• Número usado no app há pelo menos 7 dias</li>
          <li>• Conta Meta Business da loja</li>
        </ul>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={launchSignup}
          disabled={!sdkReady || connecting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {connecting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <MessageCircle size={18} />
              Conectar WhatsApp Business
            </>
          )}
        </button>

        {!sdkReady && (
          <p className="text-xs text-center text-gray-500">Carregando SDK Meta...</p>
        )}
      </div>
    </>
  );
}
