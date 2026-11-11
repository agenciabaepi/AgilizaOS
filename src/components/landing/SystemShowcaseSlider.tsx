'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
} from '@heroicons/react/24/outline';
import {
  SYSTEM_SHOWCASE_SLIDES,
  type SystemShowcaseIconId,
  type SystemShowcaseSlide,
} from '@/lib/landing/system-showcase';

const ICONS: Record<SystemShowcaseIconId, ComponentType<SVGProps<SVGSVGElement>>> = {
  ordens: ClipboardDocumentListIcon,
  dashboard: ChartBarIcon,
  financeiro: ChartPieIcon,
  contas: DocumentTextIcon,
  comissoes: CurrencyDollarIcon,
  'chat-os': ChatBubbleLeftRightIcon,
  anexos: PhotoIcon,
  mais: BoltIcon,
};

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
}: {
  slide: SystemShowcaseSlide;
  isDarkMode: boolean;
}) {
  const Icon = ICONS[slide.id];

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

        <Link
          href={`/sistema/${slide.id}`}
          className={`shrink-0 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
            isDarkMode
              ? 'border-[#D1FE6E]/35 text-[#D1FE6E] hover:bg-[#D1FE6E]/10'
              : 'border-gray-300 text-gray-700 hover:border-[#B8E55A] hover:bg-[#D1FE6E]/20'
          }`}
        >
          Ver mais detalhes
        </Link>
      </div>
    </article>
  );
}

export default function SystemShowcaseSlider({ isDarkMode }: { isDarkMode: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slides = SYSTEM_SHOWCASE_SLIDES;

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
    const next = (activeIndex - 1 + slides.length) % slides.length;
    setActiveIndex(next);
    scrollToIndex(next);
  }, [activeIndex, pauseTemporarily, scrollToIndex, slides.length]);

  const goNext = useCallback(() => {
    pauseTemporarily();
    const next = (activeIndex + 1) % slides.length;
    setActiveIndex(next);
    scrollToIndex(next);
  }, [activeIndex, pauseTemporarily, scrollToIndex, slides.length]);

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
    if (paused) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        scrollToIndex(next);
        return next;
      });
    }, 4500);
    return () => window.clearInterval(id);
  }, [paused, scrollToIndex, slides.length]);

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
        onMouseLeave={() => setPaused(false)}
        onPointerDown={pauseTemporarily}
        onTouchStart={pauseTemporarily}
        onWheel={pauseTemporarily}
      >
        {slides.map((slide) => (
          <div key={slide.id} data-showcase-card>
            <SlideCard slide={slide} isDarkMode={isDarkMode} />
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
          {slides.map((slide, index) => (
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
    </div>
  );
}
