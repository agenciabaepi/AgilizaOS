'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react';
import Image, { type StaticImageData } from 'next/image';
import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ordensImage from '@/assets/imagens/ordens.png';
import dashboardImage from '@/assets/imagens/dashboard.png';
import comissoesImage from '@/assets/imagens/comissoes.png';
import financeiroImage from '@/assets/imagens/financeiro.png';
import contasPagarImage from '@/assets/imagens/contas-a-pagar.png';
import chatOsImage from '@/assets/imagens/chat-os.png';
import anexosOsImage from '@/assets/imagens/anexos-os.png';

type SystemSlide = {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  image?: StaticImageData;
  imageAlt?: string;
  summary: string;
  features: string[];
  extraFeatures?: string[];
};

const SYSTEM_SLIDES: SystemSlide[] = [
  {
    id: 'ordens',
    label: 'Ordens de Serviço',
    icon: ClipboardDocumentListIcon,
    image: ordensImage,
    imageAlt: 'Lista de ordens de serviço no Consert',
    summary:
      'Centralize todas as OS da assistência em uma única tela: filtros por status, técnico e tipo, KPIs do dia e busca rápida por cliente, aparelho ou número da ordem.',
    features: [
      'KPIs do dia: OS abertas, faturamento, retornos e aprovados',
      'Filtros por status (orçamento, aprovada, concluída, garantia e mais)',
      'Busca por OS, cliente, aparelho, serviço ou técnico',
      'Visão completa de prazo, garantia, valores e status técnico/faturamento',
      'Criação rápida com o botão + Nova OS',
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: ChartBarIcon,
    image: dashboardImage,
    imageAlt: 'Dashboard do sistema Consert',
    summary:
      'Visão geral do mês com faturamento, contas pagas, volume de OS e gráficos para entender o ritmo da assistência em segundos.',
    features: [
      'Indicadores mensais de faturamento, despesas e volume de OS',
      'Comparativo com o mês anterior',
      'Gráfico de OS por categoria de equipamento',
      'Evolução diária de ordens no período',
      'Navegação rápida entre meses',
    ],
  },
  {
    id: 'financeiro',
    label: 'Lucro & Desempenho',
    icon: ChartPieIcon,
    image: financeiroImage,
    imageAlt: 'Lucro e desempenho no Consert',
    summary:
      'Acompanhe receita, despesas e lucro do mês com margem, composição de gastos e comparativo com o período anterior.',
    features: [
      'Receita, despesas e lucro do mês em um só lugar',
      'Margem de lucro calculada automaticamente',
      'Composição de despesas (peças, variáveis e fixas)',
      'Comparativo com o mês anterior e variação percentual',
      'Abas por OS, por técnico e DRE',
    ],
  },
  {
    id: 'contas',
    label: 'Contas a Pagar',
    icon: DocumentTextIcon,
    image: contasPagarImage,
    imageAlt: 'Contas a pagar no Consert',
    summary:
      'Gerencie despesas fixas e variáveis com categorias, vencimentos, status de pagamento e ações rápidas para quitar, editar ou excluir.',
    features: [
      'Resumo de pendente, pago, total de despesas e quantidade de contas',
      'Separação entre contas fixas, variáveis e de peças',
      'Categorias coloridas e filtros por status/período',
      'Controle de recorrência (ex.: parcela 12/12)',
      'Baixa rápida, edição e exclusão direto na tabela',
    ],
  },
  {
    id: 'comissoes',
    label: 'Comissões',
    icon: CurrencyDollarIcon,
    image: comissoesImage,
    imageAlt: 'Comissões dos técnicos no Consert',
    summary:
      'Resumo e gestão de comissões de todos os técnicos: totais, média por OS e status (paga, calculada, pendente e prevista).',
    features: [
      'Total de comissões, técnicos ativos e média por OS',
      'Resumo por técnico com quantidade de OS',
      'Status visual: paga, calculada, pendente e prevista',
      'Filtro por mês e exportação em CSV/PDF',
      'Modo admin com edição habilitada',
    ],
  },
  {
    id: 'chat-os',
    label: 'Chat da OS',
    icon: ChatBubbleLeftRightIcon,
    image: chatOsImage,
    imageAlt: 'Chat interno vinculado à ordem de serviço',
    summary:
      'Converse sobre cada ordem sem sair do fluxo: chats ligados à OS, histórico de conversas e contexto completo do cliente e do aparelho.',
    features: [
      'Chat interno vinculado à ordem de serviço',
      'Lista de conversas recentes por OS',
      'Contexto da OS, cliente e aparelho lado a lado',
      'Checklist de entrada e status sempre visíveis',
      'Comunicação da equipe sem perder o histórico',
    ],
  },
  {
    id: 'anexos',
    label: 'Anexos na OS',
    icon: PhotoIcon,
    image: anexosOsImage,
    imageAlt: 'Anexos de imagens na ordem de serviço',
    summary:
      'Registre fotos do aparelho na entrada e no andamento do reparo — evidências visuais organizadas na própria ordem de serviço.',
    features: [
      'Upload e visualização de fotos direto na OS',
      'Registro visual do estado do aparelho',
      'Organização por ordem para consulta rápida',
      'Suporte ao fluxo de entrada e acompanhamento',
      'Histórico de imagens disponível para a equipe',
    ],
  },
  {
    id: 'mais',
    label: 'Muito mais',
    icon: BoltIcon,
    summary:
      'Além das telas acima, o Consert inclui recursos que cobrem o dia a dia completo da assistência técnica.',
    features: [
      'Laudos com IA',
      'App mobile para técnicos',
      'WhatsApp integrado',
      'Checklist digital',
      'Caixa e PDV',
      'Notas fiscais',
    ],
    extraFeatures: ['Laudos com IA', 'App mobile', 'WhatsApp', 'Checklist', 'Caixa', 'Notas fiscais'],
  },
];

function BrowserChrome({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 border-b ${
        isDarkMode ? 'bg-zinc-900/90 border-white/10' : 'bg-gray-100 border-gray-200'
      }`}
    >
      <div className="flex gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-400/70" />
        <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
        <span className="w-2 h-2 rounded-full bg-green-400/70" />
      </div>
      <div
        className={`flex-1 h-6 rounded-md flex items-center justify-center text-[11px] ${
          isDarkMode ? 'bg-white/[0.06] text-white/25' : 'bg-white text-gray-400 border border-gray-200'
        }`}
      >
        gestaoconsert.com.br
      </div>
    </div>
  );
}

function SlideCard({
  slide,
  isDarkMode,
  onDetails,
}: {
  slide: SystemSlide;
  isDarkMode: boolean;
  onDetails: (slide: SystemSlide) => void;
}) {
  const Icon = slide.icon;

  return (
    <article
      className={`group shrink-0 w-[min(88vw,720px)] snap-center rounded-2xl border overflow-hidden transition-all duration-300 hover:border-[#D1FE6E]/30 ${
        isDarkMode
          ? 'bg-white/[0.03] border-white/10'
          : 'bg-white border-gray-200 shadow-lg shadow-black/5'
      }`}
    >
      <BrowserChrome isDarkMode={isDarkMode} />

      {slide.image ? (
        <div className="relative w-full bg-white">
          <Image
            src={slide.image}
            alt={slide.imageAlt ?? slide.label}
            className="w-full h-auto"
            quality={90}
            sizes="(max-width: 768px) 88vw, 720px"
            priority={slide.id === 'ordens' || slide.id === 'dashboard'}
          />
        </div>
      ) : (
        <div
          className={`px-6 py-10 sm:py-12 min-h-[280px] sm:min-h-[320px] flex flex-col items-center justify-center gap-5 ${
            isDarkMode
              ? 'bg-gradient-to-br from-zinc-900/80 to-black/60'
              : 'bg-gradient-to-br from-gray-50 to-white'
          }`}
        >
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${
              isDarkMode
                ? 'border-[#D1FE6E]/25 bg-[#D1FE6E]/10'
                : 'border-[#D1FE6E]/40 bg-[#D1FE6E]/15'
            }`}
          >
            <Icon className="w-6 h-6 text-[#B8E55A]" strokeWidth={1.75} />
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {slide.extraFeatures?.map((feature) => (
              <span
                key={feature}
                className={`px-3.5 py-1.5 rounded-full text-sm ${
                  isDarkMode
                    ? 'bg-white/[0.06] text-white/70 border border-white/10'
                    : 'bg-white text-gray-600 border border-gray-200 shadow-sm'
                }`}
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 border-t ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
              isDarkMode ? 'bg-[#D1FE6E]/10' : 'bg-[#D1FE6E]/15'
            }`}
          >
            <Icon className="w-4 h-4 text-[#B8E55A]" strokeWidth={1.75} />
          </div>
          <span className={`text-sm font-medium truncate ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
            {slide.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onDetails(slide)}
          className={`shrink-0 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
            isDarkMode
              ? 'border-[#D1FE6E]/35 text-[#D1FE6E] hover:bg-[#D1FE6E]/10'
              : 'border-gray-300 text-gray-700 hover:border-[#B8E55A] hover:bg-[#D1FE6E]/20'
          }`}
        >
          Ver mais detalhes
        </button>
      </div>
    </article>
  );
}

function DetailsModal({
  slide,
  isDarkMode,
  onClose,
}: {
  slide: SystemSlide;
  isDarkMode: boolean;
  onClose: () => void;
}) {
  const Icon = slide.icon;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="showcase-details-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Fechar detalhes"
        onClick={onClose}
      />

      <div
        className={`relative w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl ${
          isDarkMode
            ? 'bg-zinc-950 border-white/10 text-white'
            : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-zinc-600" aria-hidden />
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            isDarkMode
              ? 'text-white/50 hover:bg-white/10 hover:text-white'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
          }`}
          aria-label="Fechar"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {slide.image && (
          <div className={`relative border-b ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
            <BrowserChrome isDarkMode={isDarkMode} />
            <div className="relative w-full bg-white">
              <Image
                src={slide.image}
                alt={slide.imageAlt ?? slide.label}
                className="w-full h-auto"
                quality={90}
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
          </div>
        )}

        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-3 mb-4 pr-8">
            <div
              className={`inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
                isDarkMode ? 'bg-[#D1FE6E]/10' : 'bg-[#D1FE6E]/20'
              }`}
            >
              <Icon className="w-5 h-5 text-[#B8E55A]" strokeWidth={1.75} />
            </div>
            <div>
              <h3
                id="showcase-details-title"
                className={`text-xl sm:text-2xl font-medium tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {slide.label}
              </h3>
              <p className={`mt-2 text-sm sm:text-base leading-relaxed ${
                isDarkMode ? 'text-white/60' : 'text-gray-600'
              }`}>
                {slide.summary}
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {slide.features.map((feature) => (
              <li
                key={feature}
                className={`flex items-start gap-2.5 text-sm sm:text-[15px] leading-relaxed ${
                  isDarkMode ? 'text-white/75' : 'text-gray-700'
                }`}
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D1FE6E] shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SystemShowcaseSlider({ isDarkMode }: { isDarkMode: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSlide, setSelectedSlide] = useState<SystemSlide | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseTemporarily = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 8000);
  }, []);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = scroller.querySelectorAll<HTMLElement>('[data-showcase-card]');
    const target = cards[index];
    if (!target) return;
    const left = target.offsetLeft - (scroller.clientWidth - target.clientWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior });
  }, []);

  const goPrev = useCallback(() => {
    pauseTemporarily();
    const next = (activeIndex - 1 + SYSTEM_SLIDES.length) % SYSTEM_SLIDES.length;
    setActiveIndex(next);
    scrollToIndex(next);
  }, [activeIndex, pauseTemporarily, scrollToIndex]);

  const goNext = useCallback(() => {
    pauseTemporarily();
    const next = (activeIndex + 1) % SYSTEM_SLIDES.length;
    setActiveIndex(next);
    scrollToIndex(next);
  }, [activeIndex, pauseTemporarily, scrollToIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateActive = () => {
      const cards = scroller.querySelectorAll<HTMLElement>('[data-showcase-card]');
      if (!cards.length) return;
      const center = scroller.scrollLeft + scroller.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const dist = Math.abs(cardCenter - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveIndex(best);
    };

    scroller.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
    return () => scroller.removeEventListener('scroll', updateActive);
  }, []);

  useEffect(() => {
    if (paused || selectedSlide) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % SYSTEM_SLIDES.length;
        scrollToIndex(next);
        return next;
      });
    }, 4500);
    return () => window.clearInterval(id);
  }, [paused, selectedSlide, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 md:w-28 z-10"
        style={{
          background: isDarkMode
            ? 'linear-gradient(to right, rgb(0 0 0) 0%, transparent 100%)'
            : 'linear-gradient(to right, rgb(255 255 255) 0%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 md:w-28 z-10"
        style={{
          background: isDarkMode
            ? 'linear-gradient(to left, rgb(0 0 0) 0%, transparent 100%)'
            : 'linear-gradient(to left, rgb(255 255 255) 0%, transparent 100%)',
        }}
      />

      <div
        ref={scrollerRef}
        className="system-showcase-scroller flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 sm:px-6 pb-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          if (!selectedSlide) setPaused(false);
        }}
        onPointerDown={pauseTemporarily}
        onTouchStart={pauseTemporarily}
        onWheel={pauseTemporarily}
      >
        {SYSTEM_SLIDES.map((slide) => (
          <div key={slide.id} data-showcase-card>
            <SlideCard
              slide={slide}
              isDarkMode={isDarkMode}
              onDetails={(s) => {
                setPaused(true);
                setSelectedSlide(s);
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 px-4">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Slide anterior"
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 ${
            isDarkMode
              ? 'border-white/15 text-white/70 hover:border-[#D1FE6E]/40 hover:text-[#D1FE6E] hover:bg-[#D1FE6E]/10'
              : 'border-gray-300 text-gray-600 hover:border-[#B8E55A] hover:bg-[#D1FE6E]/15'
          }`}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {SYSTEM_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ir para ${slide.label}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => {
                pauseTemporarily();
                setActiveIndex(index);
                scrollToIndex(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-6 bg-[#D1FE6E]'
                  : isDarkMode
                    ? 'w-2 bg-white/25 hover:bg-white/40'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          aria-label="Próximo slide"
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 ${
            isDarkMode
              ? 'border-white/15 text-white/70 hover:border-[#D1FE6E]/40 hover:text-[#D1FE6E] hover:bg-[#D1FE6E]/10'
              : 'border-gray-300 text-gray-600 hover:border-[#B8E55A] hover:bg-[#D1FE6E]/15'
          }`}
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {selectedSlide && (
        <DetailsModal
          slide={selectedSlide}
          isDarkMode={isDarkMode}
          onClose={() => {
            setSelectedSlide(null);
            setPaused(false);
          }}
        />
      )}
    </div>
  );
}
