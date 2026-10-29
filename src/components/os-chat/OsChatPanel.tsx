'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiImage, FiMessageCircle, FiSend, FiX } from 'react-icons/fi';
import { useOsChat } from '@/hooks/useOsChat';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getOsChatAnexoDisplayUrl } from '@/lib/os-chat/anexoUrl';

type Props = {
  osId: string;
  numeroOs?: string | number | null;
  open: boolean;
  onClose: () => void;
};

function formatHora(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function OsChatPanel({ osId, numeroOs, open, onClose }: Props) {
  const { usuarioData, empresaData } = useAuth();
  const { addToast } = useToast();
  const { mensagens, loading, sending, conectado, erro, enviar } = useOsChat(open ? osId : null);
  const [texto, setTexto] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const meuId = usuarioData?.id;
  const empresaId = empresaData?.id || usuarioData?.empresa_id;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mensagens.length, open, loading]);

  if (!open) return null;

  const handleSend = async () => {
    if (!meuId || !empresaId) {
      addToast('Sessão inválida. Faça login novamente.', 'error');
      return;
    }
    if (!texto.trim() && !file) return;
    try {
      await enviar({
        empresaId,
        autorId: meuId,
        mensagem: texto,
        file,
      });
      setTexto('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Erro ao enviar mensagem', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Fechar chat"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white dark:bg-zinc-900 shadow-2xl border-l border-gray-200 dark:border-zinc-700">
        <header className="flex items-start gap-3 border-b border-gray-200 dark:border-zinc-700 px-4 py-3">
          <div className="mt-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 p-2">
            <FiMessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Chat da O.S.</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {numeroOs != null ? `OS #${numeroOs}` : 'Anotações da equipe'}
              {conectado ? ' · ao vivo' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label="Fechar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {loading && mensagens.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-zinc-400 py-10">Carregando...</p>
          ) : erro ? (
            <p className="text-center text-sm text-red-600 dark:text-red-400 py-10">{erro}</p>
          ) : mensagens.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-zinc-400 py-10 px-6">
              Nenhuma mensagem ainda. Técnico e equipe podem anotar aqui.
            </p>
          ) : (
            mensagens.map((m) => {
              const mine = m.autor_id === meuId;
              const img =
                m.anexo_display_url ||
                getOsChatAnexoDisplayUrl(m.anexo_url) ||
                (m.anexo_url?.startsWith('http') ? m.anexo_url : null);
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                      mine
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-bl-md border border-gray-200 dark:border-zinc-700'
                    }`}
                  >
                    {!mine && (
                      <div className="text-[11px] font-semibold opacity-80 mb-1">{m.autor?.nome || 'Usuário'}</div>
                    )}
                    {img && (
                      <a href={img} target="_blank" rel="noreferrer" className="block mb-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Anexo" className="max-h-48 rounded-lg object-cover" />
                      </a>
                    )}
                    {m.mensagem ? <p className="text-sm whitespace-pre-wrap break-words">{m.mensagem}</p> : null}
                    <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-gray-500 dark:text-zinc-400'}`}>
                      {formatHora(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {previewUrl && (
          <div className="px-3 pb-2">
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Prévia" className="h-16 w-16 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute -right-2 -top-2 rounded-full bg-gray-900 text-white p-0.5"
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <footer className="border-t border-gray-200 dark:border-zinc-700 p-3">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="shrink-0 rounded-lg p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
              title="Anexar imagem"
            >
              <FiImage className="h-5 w-5" />
            </button>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={1}
              placeholder="Escrever anotação..."
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-28"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || (!texto.trim() && !file)}
              className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5"
              title="Enviar"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

type FabProps = {
  osId: string;
  numeroOs?: string | number | null;
};

/** Botão flutuante + painel lateral do chat da O.S. */
export function OsChatFabWeb({ osId, numeroOs }: FabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-4 py-3 text-sm font-medium"
        title="Chat da O.S."
      >
        <FiMessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Chat da OS</span>
      </button>
      <OsChatPanel osId={osId} numeroOs={numeroOs} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default OsChatPanel;
