'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { FiDownload, FiFileText, FiLoader } from 'react-icons/fi';

interface PDFGeneratorProps {
  osId: string;
  numeroOS: string;
  className?: string;
}

export default function PDFGenerator({ osId, numeroOS, className = '' }: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/pdf/gerar-os?osId=${osId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar PDF');
      }

      // Criar blob do PDF
      const blob = await response.blob();
      
      // Criar URL temporária para download
      const url = window.URL.createObjectURL(blob);
      
      // Criar elemento de download
      const link = document.createElement('a');
      link.href = url;
      link.download = `OS-${numeroOS}.pdf`;
      
      // Adicionar ao DOM temporariamente e clicar
      document.body.appendChild(link);
      link.click();
      
      // Limpar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={generatePDF}
        disabled={isGenerating}
        variant="outline"
        className="flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <FiLoader className="w-4 h-4 animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <FiDownload className="w-4 h-4" />
            Gerar PDF
          </>
        )}
      </Button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            <FiFileText className="w-4 h-4 inline mr-1" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
