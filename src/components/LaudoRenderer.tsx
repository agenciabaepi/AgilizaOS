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
    // Remove tags perigosas
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
      .replace(/on\w+='[^']*'/gi, ''); // Remove event handlers com aspas simples

    return sanitized;
  };

  const sanitizedContent = sanitizeHTML(content);

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      style={{
        lineHeight: '1.6',
        color: '#374151'
      }}
    />
  );
}
