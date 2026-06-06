'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import MenuLayout from '@/components/MenuLayout'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import {
  Building2,
  Users,
  DollarSign,
  Calculator,
  Wrench,
  Smartphone,
  ClipboardCheck,
  FileText,
  Activity,
  Link2,
  BookOpen,
  Bell,
  Settings,
  ChevronDown,
  Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const EmpresaPage = dynamic(() => import('./empresa/page'), { ssr: false })
import UsuariosPage from './usuarios/page'
import TermosPage from './termos/page'
import StatusPage from './status/page'
import ComissoesPage from './comissoes/page'
import PrecificacaoPage from './precificacao/page'
import CatalogoPage from './catalogo/page'
import EquipamentosPage from './equipamentos/page'
import AparelhosPage from './aparelhos/page'
import ChecklistNovoPage from './checklist-novo/page'
import AvisosPage from './avisos/page'
import LinkPublicoPage from './link-publico/page'

type TabGroupId = 'geral' | 'operacao' | 'financeiro' | 'integracoes' | 'sistema'

type TabConfig = {
  name: string
  description: string
  group: TabGroupId
  icon: LucideIcon
  Component: React.ComponentType<{ embedded?: boolean }>
  permissao: string
  requerRecurso: string | null
}

const TAB_GROUPS: { id: TabGroupId; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'operacao', label: 'Operação' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'integracoes', label: 'Integrações' },
  { id: 'sistema', label: 'Sistema' },
]

const tabsConfig: TabConfig[] = [
  { name: 'Empresa', description: 'Dados e identidade da loja', group: 'geral', icon: Building2, Component: EmpresaPage, permissao: 'empresa', requerRecurso: null },
  { name: 'Usuários', description: 'Equipe e permissões', group: 'geral', icon: Users, Component: UsuariosPage, permissao: 'usuarios', requerRecurso: null },
  { name: 'Comissões', description: 'Regras para técnicos', group: 'financeiro', icon: DollarSign, Component: ComissoesPage, permissao: 'comissoes', requerRecurso: 'financeiro' },
  { name: 'Precificação', description: 'Calculadora de preços de peças', group: 'financeiro', icon: Calculator, Component: PrecificacaoPage, permissao: 'empresa', requerRecurso: null },
  { name: 'Equipamentos', description: 'Tipos de equipamento', group: 'operacao', icon: Wrench, Component: EquipamentosPage, permissao: 'equipamentos', requerRecurso: null },
  { name: 'Aparelhos', description: 'Catálogo de aparelhos', group: 'operacao', icon: Smartphone, Component: AparelhosPage, permissao: 'equipamentos', requerRecurso: null },
  { name: 'Checklist', description: 'Itens de entrada na OS', group: 'operacao', icon: ClipboardCheck, Component: ChecklistNovoPage, permissao: 'checklist', requerRecurso: null },
  { name: 'Termos de Garantia', description: 'Modelos de garantia', group: 'operacao', icon: FileText, Component: TermosPage, permissao: 'termos', requerRecurso: null },
  { name: 'Status', description: 'Fluxo das ordens de serviço', group: 'operacao', icon: Activity, Component: StatusPage, permissao: 'status', requerRecurso: null },
  { name: 'Link Público', description: 'Página de acompanhamento', group: 'geral', icon: Link2, Component: LinkPublicoPage, permissao: 'empresa', requerRecurso: null },
  { name: 'Catálogo', description: 'Produtos e serviços', group: 'integracoes', icon: BookOpen, Component: CatalogoPage, permissao: 'catalogo', requerRecurso: null },
  // WhatsApp — recurso futuro (aba desabilitada)
  { name: 'Avisos', description: 'Comunicados internos', group: 'sistema', icon: Bell, Component: AvisosPage, permissao: 'configuracoes', requerRecurso: null },
]

function ConfiguracoesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: authLoading, usuarioData } = useAuth()
  const [tabIndex, setTabIndex] = useState(0)
  const [buscaAba, setBuscaAba] = useState('')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab !== null) {
      const index = Number(tab)
      if (!Number.isNaN(index) && index >= 0 && index < tabsConfig.length) {
        setTabIndex(index)
      }
    }
  }, [searchParams])

  const handleTabChange = (index: number) => {
    setTabIndex(index)
    setBuscaAba('')
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', index.toString())
    router.replace(`?${params.toString()}`)
  }

  const abaAtiva = tabsConfig[tabIndex]
  const ActiveComponent = abaAtiva?.Component

  const abasFiltradas = useMemo(() => {
    const termo = buscaAba.trim().toLowerCase()
    if (!termo) return tabsConfig.map((tab, index) => ({ tab, index }))
    return tabsConfig
      .map((tab, index) => ({ tab, index }))
      .filter(({ tab }) =>
        tab.name.toLowerCase().includes(termo) ||
        tab.description.toLowerCase().includes(termo) ||
        TAB_GROUPS.find((g) => g.id === tab.group)?.label.toLowerCase().includes(termo)
      )
  }, [buscaAba])

  const gruposVisiveis = useMemo(() => {
    const indices = new Set(abasFiltradas.map(({ index }) => index))
    return TAB_GROUPS.map((group) => ({
      ...group,
      tabs: tabsConfig
        .map((tab, index) => ({ tab, index }))
        .filter(({ tab, index }) => tab.group === group.id && indices.has(index)),
    })).filter((group) => group.tabs.length > 0)
  }, [abasFiltradas])

  const chave = searchParams.get('chave')
  if (chave) {
    return (
      <div className="p-10">
        <h1 className="text-xl font-bold">Chave recebida: {chave}</h1>
      </div>
    )
  }

  if (authLoading || !usuarioData) {
    return (
      <MenuLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="flex gap-6">
              <div className="hidden lg:block w-64 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded-lg" />
                ))}
              </div>
              <div className="flex-1 h-64 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </MenuLayout>
    )
  }

  return (
    <MenuLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header da página */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configurações</h1>
              <p className="text-sm text-gray-500">Gerencie preferências, equipe e integrações do sistema</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Navegação — mobile: seletor + busca */}
          <div className="lg:hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={buscaAba}
                onChange={(e) => setBuscaAba(e.target.value)}
                placeholder="Buscar configuração..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            {buscaAba ? (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden max-h-64 overflow-y-auto">
                {abasFiltradas.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">Nenhuma seção encontrada</p>
                ) : (
                  abasFiltradas.map(({ tab, index }) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.name}
                        type="button"
                        onClick={() => handleTabChange(index)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-0',
                          tabIndex === index ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                        )}
                      >
                        <Icon size={18} className={tabIndex === index ? 'text-white' : 'text-gray-500'} />
                        <span>
                          <span className="block text-sm font-medium">{tab.name}</span>
                          <span className={cn('block text-xs', tabIndex === index ? 'text-gray-300' : 'text-gray-500')}>
                            {tab.description}
                          </span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="relative">
                <select
                  value={tabIndex}
                  onChange={(e) => handleTabChange(Number(e.target.value))}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm font-medium text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                >
                  {tabsConfig.map((tab, index) => (
                    <option key={tab.name} value={index}>
                      {tab.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            )}

            {abaAtiva && !buscaAba && (
              <p className="text-xs text-gray-500 px-1">{abaAtiva.description}</p>
            )}
          </div>

          {/* Navegação — desktop: sidebar agrupada */}
          <nav className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={buscaAba}
                  onChange={(e) => setBuscaAba(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {gruposVisiveis.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-500 text-center">Nenhuma seção encontrada</p>
                ) : (
                  gruposVisiveis.map((group) => (
                    <div key={group.id} className="mb-3 last:mb-0">
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {group.label}
                      </p>
                      <ul className="space-y-0.5">
                        {group.tabs.map(({ tab, index }) => {
                          const Icon = tab.icon
                          const selected = tabIndex === index
                          return (
                            <li key={tab.name}>
                              <button
                                type="button"
                                onClick={() => handleTabChange(index)}
                                className={cn(
                                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                                  selected
                                    ? 'bg-gray-900 text-white shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-50'
                                )}
                              >
                                <Icon
                                  size={16}
                                  className={cn('shrink-0', selected ? 'text-white' : 'text-gray-400')}
                                />
                                <span className="font-medium truncate">{tab.name}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </nav>

          {/* Conteúdo da aba ativa */}
          <main className="flex-1 min-w-0">
            {abaAtiva && (
              <div className="hidden lg:flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <abaAtiva.icon size={18} className="text-gray-400" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{abaAtiva.name}</h2>
                  <p className="text-xs text-gray-500">{abaAtiva.description}</p>
                </div>
              </div>
            )}

            <div className="min-h-[400px]">
              {ActiveComponent ? <ActiveComponent embedded /> : null}
            </div>
          </main>
        </div>
      </div>
    </MenuLayout>
  )
}

export default function ConfiguracoesPage() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Suspense fallback={<div className="p-8">Carregando configurações...</div>}>
          <ConfiguracoesInner />
        </Suspense>
      </ConfirmProvider>
    </ToastProvider>
  )
}
