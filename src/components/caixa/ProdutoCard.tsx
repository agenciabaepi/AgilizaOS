import React from 'react';
import { cn } from '@/lib/utils';

interface ProdutoCardProps {
  produto: {
    id: string;
    nome: string;
    preco: number;
    categoria?: string;
    imagem_url?: string;
    codigo?: string;
  };
  onClick: () => void;
  className?: string;
}

export function ProdutoCard({ produto, onClick, className }: ProdutoCardProps) {
  return (
    <div 
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col h-full',
        className
      )}
      onClick={onClick}
    >
      {/* Imagem do produto - altura fixa menor */}
      <div className="h-20 bg-gray-50 flex items-center justify-center overflow-hidden relative">
        {produto.imagem_url ? (
          <img 
            src={produto.imagem_url} 
            alt={produto.nome}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={cn(
          "w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600",
          produto.imagem_url ? "hidden" : ""
        )}>
          {produto.nome.charAt(0).toUpperCase()}
        </div>
      </div>
      
      {/* Informações do produto */}
      <div className="p-1.5 flex-1 flex flex-col justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-xs text-gray-900 mb-0.5 line-clamp-2 leading-tight">
            {produto.nome}
          </h3>
          {produto.categoria && (
            <p className="text-xs text-gray-500 mb-1 line-clamp-1">{produto.categoria}</p>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-bold text-green-600">
            R$ {produto.preco.toFixed(2).replace('.', ',')}
          </p>
          {produto.codigo && (
            <div className="text-xs text-gray-400 bg-gray-100 px-1 py-0.5 rounded text-center truncate">
              Cod. {produto.codigo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProdutoCard;
