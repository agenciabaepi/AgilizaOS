'use client';

import { useState, useEffect } from 'react';
import MenuLayout from '@/components/MenuLayout';
import Link from 'next/link';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import {
  MessageCircle,
  Settings,
  Zap,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import type { WhatsAppAutomacao } from '@/lib/whatsapp-crm/types';
import { EmbeddedSignupConnect } from '@/components/whatsapp-crm/EmbeddedSignupConnect';
import { whatsappCrmFetch } from '@/lib/api/whatsappCrmFetch';

const EVENTO_LABELS: Record<string, string> = {
  os_criada: 'OS cadastrada',
  os_status_alterado: 'Status alterado',
  os_aprovada: 'OS aprovada',
  os_concluida: 'Reparo concluído',
  os_entregue: 'OS entregue',
  os_orcamento_enviado: 'Orçamento pronto',
  os_aguardando_peca: 'Aguardando peça',
  pagamento_confirmado: 'Pagamento confirmado',
  nota_fiscal_emitida: 'Nota fiscal emitida',
};

export default function WhatsAppPage({ embedded = false }: { embedded?: boolean }) {
  const { podeAcessar } = useConfigPermission('whatsapp');
  const [aba, setAba] = useState<'conexao' | 'automacoes'>('conexao');
  const [config, setConfig] = useState<{
    phone_number_id?: string;
    business_account_id?: string;
    display_phone_number?: string;
    ativo?: boolean;
    webhook_verified?: boolean;
    connection_mode?: 'cloud_api' | 'coexistence' | null;
    is_on_biz_app?: boolean;
  } | null>(null);
  const [automacoes, setAutomacoes] = useState<WhatsAppAutomacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [form, setForm] = useState({
    phone_number_id: '',
    access_token: '',
    business_account_id: '',
    ativo: true,
  });

  useEffect(() => {
    if (!podeAcessar) return;
    void carregarDados();
  }, [podeAcessar]);

  async function carregarDados() {
    setLoading(true);
    try {
      const [cfgRes, autoRes] = await Promise.all([
        whatsappCrmFetch('/api/whatsapp/crm/config'),
        whatsappCrmFetch('/api/whatsapp/crm/automations'),
      ]);
      const cfgJson = await cfgRes.json();
      const autoJson = await autoRes.json();
      if (cfgJson.success) {
        if (cfgJson.data) {
          setConfig(cfgJson.data);
          setForm((f) => ({
            ...f,
            phone_number_id: cfgJson.data.phone_number_id ?? '',
            business_account_id: cfgJson.data.business_account_id ?? '',
            ativo: cfgJson.data.ativo ?? true,
          }));
        } else {
          setConfig(null);
          setForm({
            phone_number_id: '',
            access_token: '',
            business_account_id: '',
            ativo: true,
          });
        }
      }
      if (autoJson.success) setAutomacoes(autoJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function salvarConfig() {
    setSalvando(true);
    try {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
        alert('Configuração salva com sucesso!');
      } else {
        alert(json.error || 'Erro ao salvar');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function toggleAutomacao(id: string, ativo: boolean) {
    const res = await whatsappCrmFetch('/api/whatsapp/crm/automations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo }),
    });
    const json = await res.json();
    if (json.success) {
      setAutomacoes((prev) => prev.map((a) => (a.id === id ? { ...a, ativo } : a)));
    }
  }

  async function limparDadosWhatsApp() {
    if (
      !confirm(
        'Isso remove credenciais da API, conversas, mensagens, notas e automações desta assistência. Continuar?'
      )
    ) {
      return;
    }
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;

    setLimpando(true);
    try {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/reset', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setConfig(null);
        setAutomacoes([]);
        setForm({
          phone_number_id: '',
          access_token: '',
          business_account_id: '',
          ativo: true,
        });
        alert('Dados do WhatsApp removidos com sucesso.');
      } else {
        alert(json.error || 'Erro ao limpar dados');
      }
    } finally {
      setLimpando(false);
    }
  }

  if (!podeAcessar) {
    const denied = <AcessoNegadoComponent />;
    return embedded ? denied : <MenuLayout><div className="p-8">{denied}</div></MenuLayout>;
  }

  const content = (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">WhatsApp CRM</h2>
            <p className="text-gray-600 text-sm">
              Integração via{' '}
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:underline"
              >
                WhatsApp Cloud API (Meta)
              </a>
            </p>
          </div>
          <Link
            href="/whatsapp"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <MessageCircle size={16} />
            Abrir inbox
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      {embedded && (
        <Link
          href="/whatsapp"
          className="inline-flex items-center gap-2 text-sm text-green-700 hover:underline"
        >
          <MessageCircle size={16} />
          Abrir inbox de conversas
          <ExternalLink size={14} />
        </Link>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        {(['conexao', 'automacoes'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAba(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              aba === t
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'conexao' ? (
              <span className="inline-flex items-center gap-1.5"><Settings size={15} /> Conexão</span>
            ) : (
              <span className="inline-flex items-center gap-1.5"><Zap size={15} /> Automações</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : aba === 'conexao' ? (
        <div className="space-y-6">
          {config?.ativo ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">WhatsApp conectado</p>
                <p className="text-sm text-green-800 mt-0.5">
                  {config.display_phone_number && `${config.display_phone_number} · `}
                  {config.connection_mode === 'coexistence' || config.is_on_biz_app
                    ? 'Coexistência — app no celular + CRM'
                    : 'Cloud API'}
                </p>
              </div>
            </div>
          ) : (
            <EmbeddedSignupConnect onConnected={() => void carregarDados()} />
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <details className="rounded-xl border border-gray-200 bg-white group">
              <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-gray-700 list-none flex items-center justify-between">
                Configuração manual (avançado)
                <span className="text-gray-400 text-xs group-open:hidden">expandir</span>
              </summary>
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500">
                  Use apenas se não puder usar o botão acima ou for ambiente de testes Meta.
                </p>

                <label className="block text-sm">
                  <span className="text-gray-700">Phone Number ID</span>
                  <input
                    type="text"
                    value={form.phone_number_id}
                    onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="752768294592697"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-gray-700">Access Token</span>
                  <input
                    type="password"
                    value={form.access_token}
                    onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder={config?.phone_number_id ? '•••••••• (deixe vazio para manter)' : 'Token permanente'}
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-gray-700">Business Account ID (WABA)</span>
                  <input
                    type="text"
                    value={form.business_account_id}
                    onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  />
                  Integração ativa
                </label>

                <button
                  type="button"
                  onClick={salvarConfig}
                  disabled={salvando}
                  className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar manualmente'}
                </button>
              </div>
            </details>

            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Webhook</h3>
            <p className="text-xs text-gray-500">
              Configure no painel Meta para receber mensagens dos clientes:
            </p>
            <code className="block text-xs bg-gray-50 rounded-lg p-3 break-all">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/api/whatsapp/crm/webhook`
                : '/api/whatsapp/crm/webhook'}
            </code>
            <p className="text-xs text-gray-500">
              Verify Token: use o valor de <code className="bg-gray-100 px-1">WHATSAPP_VERIFY_TOKEN</code> no .env
            </p>

            {config?.ativo ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 size={16} />
                Webhook ativo no WABA
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle size={16} />
                Conecte o WhatsApp para ativar o webhook
              </div>
            )}
          </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 space-y-3">
            <div className="flex items-start gap-3">
              <Trash2 size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-red-900">Limpar dados do WhatsApp</h3>
                <p className="text-sm text-red-800/90 mt-1">
                  Remove a conexão com a API (Phone Number ID, token), todo o inbox, mensagens,
                  notas internas e regras de automação desta empresa. Não afeta a configuração na Meta.
                </p>
                <button
                  type="button"
                  onClick={() => void limparDadosWhatsApp()}
                  disabled={limpando}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {limpando ? 'Limpando...' : 'Limpar dados da API'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              Mensagens automáticas enviadas ao cliente quando eventos da OS ocorrem.
              Variáveis: <code className="text-xs bg-white px-1">{'{{cliente_nome}}'}</code>,{' '}
              <code className="text-xs bg-white px-1">{'{{numero_os}}'}</code>,{' '}
              <code className="text-xs bg-white px-1">{'{{status}}'}</code>,{' '}
              <code className="text-xs bg-white px-1">{'{{valor}}'}</code>
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {automacoes.map((a) => (
              <li key={a.id} className="px-4 py-4 flex items-start gap-4">
                <label className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={a.ativo}
                    onChange={(e) => toggleAutomacao(a.id, e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{a.nome}</p>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {EVENTO_LABELS[a.evento] ?? a.evento}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2">
                    {a.mensagem_template}
                  </p>
                </div>
              </li>
            ))}
            {automacoes.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-500">
                Salve a configuração de conexão para criar automações padrão.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );

  return embedded ? content : <MenuLayout><div className="p-8">{content}</div></MenuLayout>;
}
