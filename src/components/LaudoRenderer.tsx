'use client';

interface LaudoRendererProps {
  content: string;
  className?: string;
}

/**
 * Componente para renderizar o laudo técnico com HTML formatado
 * Remove tags HTML não desejadas e renderiza o conteúdo formatado
 */
export default function LaudoRenderer({ content, className = '' }: LaudoRendererProps) {
  if (!content) return null;

  // Função simples para sanitizar HTML básico (remove scripts, iframes, etc)
  const sanitizeHTML = (html: string): string => {
    // Remove tags perigosas e cores inline (quebram contraste no dark mode)
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/\scolor\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/style\s*=\s*"([^"]*)"/gi, (_m, styles: string) => {
        const cleaned = styles
          .replace(/(?:^|;)\s*color\s*:[^;]*/gi, '')
          .replace(/(?:^|;)\s*background(?:-color)?\s*:[^;]*/gi, '')
          .replace(/^;+|;+$/g, '')
          .trim();
        return cleaned ? `style="${cleaned}"` : '';
      })
      .replace(/style\s*=\s*'([^']*)'/gi, (_m, styles: string) => {
        const cleaned = styles
          .replace(/(?:^|;)\s*color\s*:[^;]*/gi, '')
          .replace(/(?:^|;)\s*background(?:-color)?\s*:[^;]*/gi, '')
          .replace(/^;+|;+$/g, '')
          .trim();
        return cleaned ? `style='${cleaned}'` : '';
      });

    return sanitized;
  };

  const sanitizedContent = sanitizeHTML(content);

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-zinc-100 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
