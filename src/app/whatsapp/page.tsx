'use client';

import { useCallback, useEffect, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { ConversationList } from '@/components/whatsapp-crm/ConversationList';
import { ChatPanel } from '@/components/whatsapp-crm/ChatPanel';
import { ClientOsSidebar } from '@/components/whatsapp-crm/ClientOsSidebar';
import { MessageCircle, Settings } from 'lucide-react';
import Link from 'next/link';
import type {
  WhatsAppConversa,
  WhatsAppMensagem,
  WhatsAppConversaNota,
  WhatsAppOsContexto,
} from '@/lib/whatsapp-crm/types';

export interface ConversaDetalhe {
  conversa: WhatsAppConversa;
  mensagens: WhatsAppMensagem[];
  notas: WhatsAppConversaNota[];
  os_contexto: WhatsAppOsContexto[];
}

export default function WhatsAppCrmPage() {
  const { podeAcessar } = useConfigPermission('whatsapp');
  const [conversas, setConversas] = useState<WhatsAppConversa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ConversaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [filtro, setFiltro] = useState<'aberta' | 'fechada' | 'todas'>('aberta');

  const carregarConversas = useCallback(async () => {
    try {
      const params = filtro !== 'todas' ? `?status=${filtro}` : '';
      const res = await fetch(`/api/whatsapp/crm/conversations${params}`);
      const json = await res.json();
      if (json.success) setConversas(json.data);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  const carregarDetalhe = useCallback(async (id: string) => {
    setLoadingDetalhe(true);
    try {
      const res = await fetch(`/api/whatsapp/crm/conversations/${id}`);
      const json = await res.json();
      if (json.success) setDetalhe(json.data);
    } finally {
      setLoadingDetalhe(false);
    }
  }, []);

  useEffect(() => {
    if (podeAcessar) carregarConversas();
  }, [podeAcessar, carregarConversas]);

  useEffect(() => {
    if (selectedId) carregarDetalhe(selectedId);
    else setDetalhe(null);
  }, [selectedId, carregarDetalhe]);

  if (!podeAcessar) {
    return (
      <MenuLayout>
        <div className="p-8"><AcessoNegadoComponent /></div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white">
              <MessageCircle size={18} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">WhatsApp CRM</h1>
              <p className="text-xs text-gray-500">Conversas vinculadas a clientes e ordens de serviço</p>
            </div>
          </div>
          <Link
            href="/configuracoes?tab=11"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings size={16} />
            Configurações
          </Link>
        </div>

        <div className="flex flex-1 min-h-0">
          <ConversationList
            conversas={conversas}
            selectedId={selectedId}
            onSelect={setSelectedId}
            filtro={filtro}
            onFiltroChange={setFiltro}
            loading={loading}
          />

          <ChatPanel
            detalhe={detalhe}
            loading={loadingDetalhe}
            onSent={() => {
              if (selectedId) carregarDetalhe(selectedId);
              carregarConversas();
            }}
          />

          <ClientOsSidebar detalhe={detalhe} loading={loadingDetalhe} />
        </div>
      </div>
    </MenuLayout>
  );
}
