'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { FiBell, FiSend, FiClock } from 'react-icons/fi';

type Tecnico = {
  id: string;
  nome: string;
  email: string;
  empresa_id: string;
  auth_user_id: string | null;
  empresa_nome: string;
};

type NotificacaoHistorico = {
  id: string;
  tecnico_nome: string;
  titulo: string;
  mensagem: string;
  enviado_em: string;
  enviado_por: string;
  aberto_em: string | null;
};

export default function NotificacoesAdminPage() {
  const { addToast } = useToast();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(true);
  const [tecnicoId, setTecnicoId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const [historico, setHistorico] = useState<NotificacaoHistorico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [historicoPage, setHistoricoPage] = useState(1);
  const [historicoTotal, setHistoricoTotal] = useState(0);
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [apenasNaoAbertas, setApenasNaoAbertas] = useState(false);

  const pageSize = 20;

  const fetchHistorico = useCallback(() => {
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
    const params = new URLSearchParams({
      page: String(historicoPage),
      pageSize: String(pageSize),
    });
    if (filtroTecnico) params.set('tecnico_id', filtroTecnico);
    if (apenasNaoAbertas) params.set('apenas_nao_abertas', '1');
    setLoadingHistorico(true);
    fetch(`${baseUrl}/api/admin-saas/notificacoes/historico?${params}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.notificacoes) setHistorico(data.notificacoes);
        if (data.total !== undefined) setHistoricoTotal(data.total);
        if (data.error) addToast('error', data.error);
      })
      .catch(() => addToast('error', 'Falha ao carregar histórico'))
      .finally(() => setLoadingHistorico(false));
  }, [historicoPage, filtroTecnico, apenasNaoAbertas, addToast]);

  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
    fetch(`${baseUrl}/api/admin-saas/tecnicos`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.tecnicos) setTecnicos(data.tecnicos);
        if (data.error) addToast('error', data.error);
      })
      .catch(() => addToast('error', 'Falha ao carregar técnicos'))
      .finally(() => setLoadingTecnicos(false));
  }, [addToast]);

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoId.trim()) {
      addToast('error', 'Selecione um técnico');
      return;
    }
    setSending(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
      const res = await fetch(`${baseUrl}/api/admin-saas/push-notification`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tecnico_id: tecnicoId,
          title: title.trim() || 'Notificação',
          body: body.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast('error', data.error || data.hint || 'Falha ao enviar notificação');
        return;
      }

      addToast(
        'success',
        data.ok
          ? `Notificação enviada para ${data.tecnico_nome || 'técnico'} (${data.sent_count} dispositivo(s))`
          : (data.error || 'Enviado com avisos')
      );
      setTitle('');
      setBody('');
      fetchHistorico();
    } catch {
      addToast('error', 'Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiBell className="text-gray-600" />
          Notificação push para técnicos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Envie uma notificação personalizada para o app do técnico. O técnico precisa ter o app instalado e ter feito login para receber.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Técnico
            </label>
            {loadingTecnicos ? (
              <p className="text-sm text-gray-500">Carregando técnicos...</p>
            ) : (
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                required
              >
                <option value="">Selecione um técnico</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                    {t.empresa_nome ? ` — ${t.empresa_nome}` : ''}
                  </option>
                ))}
              </select>
            )}
            {!loadingTecnicos && tecnicos.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">Nenhum técnico cadastrado.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lembrete de reunião"
              className="w-full"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Texto da notificação que aparecerá no celular do técnico."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button
              type="submit"
              disabled={sending || loadingTecnicos || !tecnicos.length}
              className="inline-flex items-center gap-2"
            >
              <FiSend className="text-sm" />
              {sending ? 'Enviando...' : 'Enviar notificação'}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-w-xl">
        <p className="text-xs text-gray-600">
          <strong>Dica:</strong> Se o técnico não receber, peça que abra o app no celular, vá em Perfil e toque em &quot;Enviar push de teste&quot; para registrar o dispositivo.
        </p>
      </div>

      {/* Histórico de notificações */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <FiClock className="text-gray-600" />
          Histórico de notificações
        </h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={filtroTecnico}
            onChange={(e) => { setFiltroTecnico(e.target.value); setHistoricoPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            <option value="">Todos os técnicos</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={apenasNaoAbertas}
              onChange={(e) => { setApenasNaoAbertas(e.target.checked); setHistoricoPage(1); }}
              className="rounded border-gray-300"
            />
            Apenas não abertas
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fetchHistorico()}
            disabled={loadingHistorico}
          >
            Atualizar
          </Button>
        </div>
        {loadingHistorico ? (
          <p className="text-sm text-gray-500 py-4">Carregando histórico...</p>
        ) : historico.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Nenhuma notificação enviada ainda.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">Enviado em</th>
                    <th className="py-2 pr-4">Técnico</th>
                    <th className="py-2 pr-4">Título</th>
                    <th className="py-2 pr-4">Abriu em</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-700">
                        {new Date(n.enviado_em).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4 text-gray-700">{n.tecnico_nome}</td>
                      <td className="py-2 pr-4 text-gray-700 max-w-xs truncate" title={n.titulo}>{n.titulo}</td>
                      <td className="py-2 pr-4 text-gray-700">
                        {n.aberto_em
                          ? new Date(n.aberto_em).toLocaleString('pt-BR')
                          : <span className="text-amber-600">Não abriu</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historicoTotal > pageSize && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>
                  {((historicoPage - 1) * pageSize) + 1}–{Math.min(historicoPage * pageSize, historicoTotal)} de {historicoTotal}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={historicoPage <= 1}
                    onClick={() => setHistoricoPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={historicoPage * pageSize >= historicoTotal}
                    onClick={() => setHistoricoPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
