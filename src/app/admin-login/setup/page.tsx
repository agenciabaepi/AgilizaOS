'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';

export default function Admin2FASetupPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin-saas/2fa/setup');
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Erro ao gerar configuração');
        }
        if (!cancelled) {
          setData({ secret: json.secret, qrDataUrl: json.qrDataUrl });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copySecret = () => {
    if (!data?.secret) return;
    navigator.clipboard.writeText(data.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-200 text-center">
          <p className="text-red-600 mb-4">{error || 'Dados não disponíveis'}</p>
          <Link href="/admin-login" className="text-gray-700 underline">Voltar ao login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurar 2FA (App Autenticador)</h1>
          <p className="text-sm text-gray-600">
            Use esta página <strong>uma vez</strong> para configurar o acesso admin com app de duas etapas.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <img src={data.qrDataUrl} alt="QR Code 2FA" className="rounded-lg border border-gray-200" />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">1. Escaneie o QR no app</p>
            <p className="text-xs text-gray-500">
              Abra Google Authenticator, Authy, Microsoft Authenticator ou similar e escaneie o código acima.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">2. Adicione o secret no servidor</p>
            <p className="text-xs text-gray-500 mb-2">
              Copie o valor abaixo e adicione no arquivo <code className="bg-gray-100 px-1 rounded">.env</code>:
            </p>
            <p className="text-xs text-gray-500 mb-1">ADMIN_TOTP_SECRET=</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono break-all">
                {data.secret}
              </code>
              <Button
                type="button"
                onClick={copySecret}
                className="shrink-0 bg-gray-800 hover:bg-gray-700 text-white text-sm"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            ⚠️ Reinicie o servidor após alterar o <code>.env</code>. Não compartilhe o secret nem recarregue esta página (um novo secret seria gerado).
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link href="/admin-login" className="text-gray-600 hover:text-gray-900 underline text-sm">
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
