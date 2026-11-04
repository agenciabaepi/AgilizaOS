'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const WHATSAPP_NUMBER = '5512988353971';

const ASSUNTOS = [
  { id: 'duvida', label: 'Dúvida sobre o sistema' },
  { id: 'bug', label: 'Problema técnico / erro' },
  { id: 'assinatura', label: 'Assinatura e cobrança' },
  { id: 'sugestao', label: 'Sugestão de melhoria' },
  { id: 'outro', label: 'Outro assunto' },
] as const;

type AssuntoId = (typeof ASSUNTOS)[number]['id'];

function mensagemPadrao(assuntoLabel: string, nome?: string | null, empresa?: string | null) {
  const quem = nome?.trim() || 'usuário';
  const de = empresa?.trim() ? ` da empresa ${empresa.trim()}` : '';
  return `Olá! Sou ${quem}${de}.\n\nAssunto: ${assuntoLabel}\n\nGostaria de ajuda com: `;
}

interface SupportWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportWhatsAppModal({ isOpen, onClose }: SupportWhatsAppModalProps) {
  const { usuarioData, empresaData } = useAuth();
  const [assuntoId, setAssuntoId] = useState<AssuntoId>('duvida');
  const [mensagem, setMensagem] = useState('');

  const assuntoLabel = useMemo(
    () => ASSUNTOS.find((a) => a.id === assuntoId)?.label ?? 'Outro assunto',
    [assuntoId]
  );

  useEffect(() => {
    if (!isOpen) return;
    setAssuntoId('duvida');
    setMensagem(
      mensagemPadrao(
        ASSUNTOS[0].label,
        usuarioData?.nome ?? usuarioData?.email,
        empresaData?.nome
      )
    );
  }, [isOpen, usuarioData?.nome, usuarioData?.email, empresaData?.nome]);

  if (!isOpen) return null;

  const podeEnviar = mensagem.trim().length >= 10;

  const handleAssuntoChange = (id: AssuntoId) => {
    setAssuntoId(id);
    const label = ASSUNTOS.find((a) => a.id === id)?.label ?? 'Outro assunto';
    setMensagem(mensagemPadrao(label, usuarioData?.nome ?? usuarioData?.email, empresaData?.nome));
  };

  const handleEnviar = () => {
    if (!podeEnviar) return;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suporte-whatsapp-titulo"
        className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 dark:border dark:border-zinc-600 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/whatsapp.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
                draggable={false}
              />
            </div>
            <div className="min-w-0">
              <h2 id="suporte-whatsapp-titulo" className="text-lg font-bold text-gray-900 dark:text-zinc-50 truncate">
                WhatsApp suporte
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">(12) 98835-3971</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/50 dark:bg-amber-950/40">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
              O atendimento pode levar até <strong>15 minutos</strong> para responder.
              Enquanto isso, descreva bem o assunto para agilizar.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="suporte-assunto" className="block text-sm font-medium text-gray-800 dark:text-zinc-200">
              Assunto
            </label>
            <select
              id="suporte-assunto"
              value={assuntoId}
              onChange={(e) => handleAssuntoChange(e.target.value as AssuntoId)}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]"
            >
              {ASSUNTOS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="suporte-mensagem" className="block text-sm font-medium text-gray-800 dark:text-zinc-200">
              Pré-mensagem
            </label>
            <textarea
              id="suporte-mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={6}
              placeholder={`Descreva sua dúvida sobre: ${assuntoLabel}`}
              className="w-full resize-y rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Essa mensagem será aberta pronta no WhatsApp.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 dark:border-zinc-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleEnviar}
              disabled={!podeEnviar}
              className="flex-1 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1ebe57] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar no WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
