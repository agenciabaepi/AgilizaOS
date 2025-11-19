'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

type Step = 'email' | '2fa' | 'loading';

export default function AdminLoginPage() {
  const router = useRouter();
  
  // ⚠️ SEGURANÇA: Verificar se já está logado e redirecionar
  useEffect(() => {
    const checkAuth = () => {
      if (typeof document === 'undefined') return;
      
      const cookies = document.cookie.split(';');
      const hasAccess = cookies.some(cookie => 
        cookie.trim().startsWith('admin_saas_access=1')
      );
      
      // Se já está autenticado, redirecionar para dashboard
      if (hasAccess) {
        router.replace('/admin-saas');
      }
    };
    
    checkAuth();
  }, [router]);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown para reenvio de código
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin-saas/2fa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, whatsapp }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Erro ao enviar código');
      }

      setStep('2fa');
      setCountdown(60); // 60 segundos para reenvio
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin-saas/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Código inválido');
      }

      // Redirecionar para o admin
      router.push('/admin-saas');
    } catch (err: any) {
      setError(err.message || 'Erro ao validar código');
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (countdown > 0) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin-saas/2fa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, whatsapp }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Erro ao reenviar código');
      }

      setCountdown(60);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar código');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 border border-gray-200">
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔐</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Admin SaaS
          </h1>
          <p className="text-sm text-gray-600">
            Acesso restrito - Verificação em duas etapas
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <span className="text-red-500">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        {step === '2fa' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
            <span className="text-blue-500">📱</span>
            <span>Enviamos um código de 6 dígitos para seu WhatsApp. Verifique suas mensagens.</span>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Administrador
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp (com DDD)
              </label>
              <Input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="11999999999"
                required
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enviaremos o código de verificação via WhatsApp
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              {loading ? 'Enviando código...' : 'Enviar código via WhatsApp'}
            </Button>
          </form>
        )}

        {step === '2fa' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Verificação
              </label>
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={codigo[i] || ''}
                    onChange={(e) => {
                      const newCode = codigo.split('');
                      newCode[i] = e.target.value.replace(/\D/g, '');
                      setCodigo(newCode.join('').slice(0, 6));
                      // Focar próximo input automaticamente
                      if (e.target.value && i < 5) {
                        const nextInput = document.getElementById(`code-${i + 1}`);
                        nextInput?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !codigo[i] && i > 0) {
                        const prevInput = document.getElementById(`code-${i - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    id={`code-${i}`}
                    className="w-12 h-14 text-center text-2xl font-mono border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none transition-colors"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">
                Digite o código de 6 dígitos enviado para seu WhatsApp
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Voltar
              </button>

              {countdown > 0 ? (
                <span className="text-gray-500">
                  Reenviar em {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-black hover:underline"
                >
                  Reenviar código
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || codigo.length !== 6}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              {loading ? 'Validando...' : 'Validar código'}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            🔒 Acesso protegido por verificação em duas etapas via WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}

