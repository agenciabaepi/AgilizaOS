'use client';

import React from 'react';

// Skeleton para criação de OS
export const OSCreateSkeleton = () => {
  return (
    <div className="p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4 animate-pulse">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-5 bg-gray-100 rounded w-64"></div>
        </div>
      </div>

      {/* Progress Steps Skeleton */}
      <div className="flex items-center justify-center mb-8 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            </div>
            {i < 4 && <div className="w-16 h-1 bg-gray-200 mx-2"></div>}
          </div>
        ))}
      </div>

      {/* Form Content Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="space-y-6">
          <div>
            <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
          </div>
          <div>
            <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="h-5 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            </div>
            <div>
              <div className="h-5 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
            </div>
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex justify-between mt-8">
          <div className="h-12 bg-gray-200 rounded-lg w-24"></div>
          <div className="h-12 bg-blue-600 rounded-lg w-32"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente base para skeleton loading
 */
const SkeletonBase = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  />
);

/**
 * Skeleton para página de lista de OS
 */
export const OSListSkeleton = () => (
  <div className="p-4 md:p-8 space-y-6">
    {/* Header */}
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <SkeletonBase className="h-8 w-64 mb-2" />
        <SkeletonBase className="h-4 w-96" />
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="h-10 w-24" />
        <SkeletonBase className="h-10 w-32" />
      </div>
    </div>

    {/* Cards de métricas */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBase className="h-4 w-20" />
            <SkeletonBase className="h-5 w-5 rounded-full" />
          </div>
          <SkeletonBase className="h-8 w-16 mb-2" />
          <SkeletonBase className="h-3 w-24" />
        </div>
      ))}
    </div>

    {/* Abas */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex border-b border-gray-200">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <SkeletonBase className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>

    {/* Filtros */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <SkeletonBase className="h-10 flex-1" />
        <div className="flex gap-3">
          <SkeletonBase className="h-10 w-48" />
          <SkeletonBase className="h-10 w-40" />
          <SkeletonBase className="h-10 w-48" />
          <SkeletonBase className="h-10 w-20" />
        </div>
      </div>
    </div>

    {/* Tabela */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header da tabela */}
      <div className="border-b border-gray-200 p-4">
        <div className="grid grid-cols-11 gap-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <SkeletonBase key={i} className="h-4" />
          ))}
        </div>
      </div>
      
      {/* Linhas da tabela */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-11 gap-4">
            {Array.from({ length: 11 }).map((_, j) => (
              <div key={j} className="space-y-1">
                <SkeletonBase className="h-3" />
                <SkeletonBase className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton para página de visualizar OS
 */
export const OSViewSkeleton = () => (
  <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-8 w-8" />
        <div>
          <SkeletonBase className="h-8 w-48 mb-2" />
          <SkeletonBase className="h-4 w-32" />
        </div>
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="h-10 w-20" />
        <SkeletonBase className="h-10 w-24" />
      </div>
    </div>

    {/* Informações principais */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna 1 - Cliente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBase className="h-6 w-6" />
          <SkeletonBase className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          <SkeletonBase className="h-6 w-full" />
          <SkeletonBase className="h-4 w-32" />
          <SkeletonBase className="h-4 w-28" />
        </div>
      </div>

      {/* Coluna 2 - Aparelho */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBase className="h-6 w-6" />
          <SkeletonBase className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          <SkeletonBase className="h-6 w-full" />
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-4 w-24" />
        </div>
      </div>

      {/* Coluna 3 - Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBase className="h-6 w-6" />
          <SkeletonBase className="h-5 w-16" />
        </div>
        <div className="space-y-3">
          <SkeletonBase className="h-8 w-24" />
          <SkeletonBase className="h-6 w-32" />
        </div>
      </div>
    </div>

    {/* Detalhes */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <SkeletonBase className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-3/4" />
          <SkeletonBase className="h-4 w-2/3" />
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <SkeletonBase className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-4/5" />
        </div>
      </div>
    </div>

    {/* Imagens */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <SkeletonBase className="h-6 w-24 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBase key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Skeleton para página de criar OS
 */
export const OSCreateSkeleton = () => (
  <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
    {/* Header */}
    <div>
      <SkeletonBase className="h-8 w-48 mb-2" />
      <SkeletonBase className="h-4 w-64" />
    </div>

    {/* Stepper */}
    <div className="flex items-center justify-center space-x-4 py-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center">
          <SkeletonBase className="h-8 w-8 rounded-full" />
          {i < 4 && <SkeletonBase className="h-0.5 w-16 mx-4" />}
        </div>
      ))}
    </div>

    {/* Formulário */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <SkeletonBase className="h-6 w-32 mb-4" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-10 w-full" />
        </div>
      </div>

      <div className="space-y-4">
        <SkeletonBase className="h-4 w-24" />
        <SkeletonBase className="h-24 w-full" />
      </div>
    </div>

    {/* Botões */}
    <div className="flex justify-between">
      <SkeletonBase className="h-10 w-24" />
      <SkeletonBase className="h-10 w-32" />
    </div>
  </div>
);

/**
 * Skeleton para página de editar OS
 */
export const OSEditSkeleton = () => (
  <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-8 w-8" />
        <div>
          <SkeletonBase className="h-8 w-48 mb-2" />
          <SkeletonBase className="h-4 w-32" />
        </div>
      </div>
      <SkeletonBase className="h-10 w-24" />
    </div>

    {/* Abas */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex border-b border-gray-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <SkeletonBase className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>

    {/* Conteúdo das abas */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        {/* Formulário principal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <SkeletonBase className="h-6 w-32 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBase className="h-4 w-20" />
                <SkeletonBase className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Produtos e Serviços */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <SkeletonBase className="h-6 w-40 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <SkeletonBase className="h-4 w-32 mb-1" />
                  <SkeletonBase className="h-3 w-20" />
                </div>
                <SkeletonBase className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton genérico para operações rápidas
 */
export const OSQuickSkeleton = () => (
  <div className="flex items-center justify-center py-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="flex space-x-2">
        <SkeletonBase className="h-2 w-2 rounded-full animate-pulse" />
        <SkeletonBase className="h-2 w-2 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
        <SkeletonBase className="h-2 w-2 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
      </div>
      <SkeletonBase className="h-4 w-32" />
    </div>
  </div>
);

export default {
  OSListSkeleton,
  OSViewSkeleton,
  OSCreateSkeleton,
  OSEditSkeleton,
  OSQuickSkeleton
};

import React from 'react';

/**
 * Componente base para skeleton loading
 */
const SkeletonBase = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    {...props}
  />
);

/**
 * Skeleton para página de lista de OS
 */
export const OSListSkeleton = () => (
  <div className="p-4 md:p-8 space-y-6">
    {/* Header */}
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <SkeletonBase className="h-8 w-64 mb-2" />
        <SkeletonBase className="h-4 w-96" />
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="h-10 w-24" />
        <SkeletonBase className="h-10 w-32" />
      </div>
    </div>

    {/* Cards de métricas */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBase className="h-4 w-20" />
            <SkeletonBase className="h-5 w-5 rounded-full" />
          </div>
          <SkeletonBase className="h-8 w-16 mb-2" />
          <SkeletonBase className="h-3 w-24" />
        </div>
      ))}
    </div>

    {/* Abas */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex border-b border-gray-200">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <SkeletonBase className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>

    {/* Filtros */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <SkeletonBase className="h-10 flex-1" />
        <div className="flex gap-3">
          <SkeletonBase className="h-10 w-48" />
          <SkeletonBase className="h-10 w-40" />
          <SkeletonBase className="h-10 w-48" />
          <SkeletonBase className="h-10 w-20" />
        </div>
      </div>
    </div>

    {/* Tabela */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header da tabela */}
      <div className="border-b border-gray-200 p-4">
        <div className="grid grid-cols-11 gap-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <SkeletonBase key={i} className="h-4" />
          ))}
        </div>
      </div>
      
      {/* Linhas da tabela */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-11 gap-4">
            {Array.from({ length: 11 }).map((_, j) => (
              <div key={j} className="space-y-1">
                <SkeletonBase className="h-3" />
                <SkeletonBase className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton para página de visualizar OS
 */
export const OSViewSkeleton = () => (
  <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-8 w-8" />
        <div>
          <SkeletonBase className="h-8 w-48 mb-2" />
          <SkeletonBase className="h-4 w-32" />
        </div>
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="h-10 w-20" />
        <SkeletonBase className="h-10 w-24" />
      </div>
    </div>

    {/* Informações principais */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna 1 - Cliente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBase className="h-6 w-6" />
          <SkeletonBase className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          <SkeletonBase className="h-6 w-full" />
          <SkeletonBase className="h-4 w-32" />
          <SkeletonBase className="h-4 w-28" />
        </div>
      </div>

      {/* Coluna 2 - Aparelho */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBase className="h-6 w-6" />
          <SkeletonBase className="h-5 w-24" />
        </div>
        <div className="space-y-3">
          <SkeletonBase className="h-6 w-full" />
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-4 w-24" />
        </div>
      </div>

      {/* Coluna 3 - Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBase className="h-6 w-6" />
          <SkeletonBase className="h-5 w-16" />
        </div>
        <div className="space-y-3">
          <SkeletonBase className="h-8 w-24" />
          <SkeletonBase className="h-6 w-32" />
        </div>
      </div>
    </div>

    {/* Detalhes */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <SkeletonBase className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-3/4" />
          <SkeletonBase className="h-4 w-2/3" />
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <SkeletonBase className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          <SkeletonBase className="h-4 w-full" />
          <SkeletonBase className="h-4 w-4/5" />
        </div>
      </div>
    </div>

    {/* Imagens */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <SkeletonBase className="h-6 w-24 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBase key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Skeleton para página de criar OS
 */
export const OSCreateSkeleton = () => (
  <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
    {/* Header */}
    <div>
      <SkeletonBase className="h-8 w-48 mb-2" />
      <SkeletonBase className="h-4 w-64" />
    </div>

    {/* Stepper */}
    <div className="flex items-center justify-center space-x-4 py-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center">
          <SkeletonBase className="h-8 w-8 rounded-full" />
          {i < 4 && <SkeletonBase className="h-0.5 w-16 mx-4" />}
        </div>
      ))}
    </div>

    {/* Formulário */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <SkeletonBase className="h-6 w-32 mb-4" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-10 w-full" />
        </div>
      </div>

      <div className="space-y-4">
        <SkeletonBase className="h-4 w-24" />
        <SkeletonBase className="h-24 w-full" />
      </div>
    </div>

    {/* Botões */}
    <div className="flex justify-between">
      <SkeletonBase className="h-10 w-24" />
      <SkeletonBase className="h-10 w-32" />
    </div>
  </div>
);

/**
 * Skeleton para página de editar OS
 */
export const OSEditSkeleton = () => (
  <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-8 w-8" />
        <div>
          <SkeletonBase className="h-8 w-48 mb-2" />
          <SkeletonBase className="h-4 w-32" />
        </div>
      </div>
      <SkeletonBase className="h-10 w-24" />
    </div>

    {/* Abas */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex border-b border-gray-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <SkeletonBase className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>

    {/* Conteúdo das abas */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        {/* Formulário principal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <SkeletonBase className="h-6 w-32 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBase className="h-4 w-20" />
                <SkeletonBase className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Produtos e Serviços */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <SkeletonBase className="h-6 w-40 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <SkeletonBase className="h-4 w-32 mb-1" />
                  <SkeletonBase className="h-3 w-20" />
                </div>
                <SkeletonBase className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton genérico para operações rápidas
 */
export const OSQuickSkeleton = () => (
  <div className="flex items-center justify-center py-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="flex space-x-2">
        <SkeletonBase className="h-2 w-2 rounded-full animate-pulse" />
        <SkeletonBase className="h-2 w-2 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
        <SkeletonBase className="h-2 w-2 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
      </div>
      <SkeletonBase className="h-4 w-32" />
    </div>
  </div>
);

export default {
  OSListSkeleton,
  OSViewSkeleton,
  OSCreateSkeleton,
  OSEditSkeleton,
  OSQuickSkeleton
};

