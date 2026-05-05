'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function ConfigClient() {
  const [valor, setValor] = useState<string>('119.90');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin-saas/config/valor-assinatura', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && typeof data.valor === 'number') {
          setValor(String(data.valor));
        }
      })
      .catch(() => setMessage({ type: 'error', text: 'Erro ao carregar valor' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = valor.trim().replace(/R\$\s?/gi, '');
    const numValor = parseFloat(
      /^\d+(\.\d+)?$/.test(trimmed)
        ? trimmed
        : trimmed.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    );
    if (!Number.isFinite(numValor) || numValor <= 0) {
      setMessage({ type: 'error', text: 'Informe um valor válido (ex: 119.90)' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin-saas/config/valor-assinatura', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: numValor }),
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string; hint?: string; code?: string; reason?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 240);
        setMessage({
          type: 'error',
          text: snippet || `Resposta inválida do servidor (${res.status})`,
        });
        return;
      }

      if (!res.ok) {
        const parts = [data?.error, data?.reason, data?.hint, data?.code].filter(Boolean);
        setMessage({
          type: 'error',
          text: parts.length ? parts.join(' — ') : `Erro ao salvar (${res.status})`,
        });
        return;
      }

      setMessage({ type: 'success', text: 'Valor atualizado com sucesso!' });
      setValor(String(numValor));
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-12 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Preço global da assinatura</h2>
        <p className="text-sm text-gray-500">
          Valor padrão mensal (checkout, landing e planos). Para cobrar um valor diferente em uma empresa
          específica, use <strong>Empresas</strong> → empresa → <strong>Alterar assinatura</strong> (campo opcional)
          ou o ajuste rápido na ficha da empresa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <input
                id="valor"
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="119.90"
                className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span> Salvando...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" /> Salvar
              </>
            )}
          </button>
        </div>
      </form>

      {message && (
        <div
          className={`flex items-center gap-2 max-w-md px-4 py-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <FiCheck className="w-5 h-5 flex-shrink-0" />
          ) : (
            <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200 max-w-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Onde o valor é usado</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Landing page (seção de preços)</li>
          <li>• Página de planos</li>
          <li>• Checkout PIX (pagamento)</li>
          <li>• Renovação de assinatura</li>
        </ul>
      </div>
    </div>
  );
}
