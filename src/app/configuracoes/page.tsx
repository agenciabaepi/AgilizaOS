'use client'

import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import MenuLayout from '@/components/MenuLayout'
import { Tab } from '@headlessui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'

// Apenas Empresa usa dynamic (ssr: false). Demais: import estático para evitar erro de HMR "module factory is not available"
const EmpresaPage = dynamic(() => import('./empresa/page'), { ssr: false })
import UsuariosPage from './usuarios/page'
import TermosPage from './termos/page'
import StatusPage from './status/page'
import ComissoesPage from './comissoes/page'
import CatalogoPage from './catalogo/page'
import WhatsAppPage from './whatsapp/page'
import EquipamentosPage from './equipamentos/page'
import ChecklistNovoPage from './checklist-novo/page'
import AvisosPage from './avisos/page'
import LinkPublicoPage from './link-publico/page'

function ConfiguracoesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, usuarioData } = useAuth()
  const [tabIndex, setTabIndex] = useState(0)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setTabIndex(Number(tab))
  }, [searchParams])

  const handleTabChange = (index: number) => {
    setTabIndex(index)
    const params = new URLSearchParams(searchParams)
    params.set('tab', index.toString())
    router.replace(`?${params.toString()}`)
  }

  const chave = searchParams.get('chave')
  if (chave) {
    return (
      <div className="p-10">
        <h1 className="text-xl font-bold">Chave recebida: {chave}</h1>
      </div>
    )
  }

  // Se ainda está carregando a autenticação ou dados do usuário, mostra loading
  if (authLoading || !usuarioData) {
    return (
      <MenuLayout>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </MenuLayout>
    )
  }

  // Plano único R$119,90 - todas as abas visíveis para todos
  const tabsConfig = [
    { name: 'Empresa', Component: EmpresaPage, permissao: 'empresa', requerRecurso: null },
    { name: 'Usuários', Component: UsuariosPage, permissao: 'usuarios', requerRecurso: null },
    { name: 'Comissões', Component: ComissoesPage, permissao: 'comissoes', requerRecurso: 'financeiro' },
    { name: 'Equipamentos', Component: EquipamentosPage, permissao: 'equipamentos', requerRecurso: null },
    { name: 'Checklist', Component: ChecklistNovoPage, permissao: 'checklist', requerRecurso: null },
    { name: 'Termos de Garantia', Component: TermosPage, permissao: 'termos', requerRecurso: null },
    { name: 'Status', Component: StatusPage, permissao: 'status', requerRecurso: null },
    { name: 'Link Público', Component: LinkPublicoPage, permissao: 'empresa', requerRecurso: null },
    { name: 'Catálogo', Component: CatalogoPage, permissao: 'catalogo', requerRecurso: null },
    { name: 'WhatsApp', Component: WhatsAppPage, permissao: 'whatsapp', requerRecurso: 'whatsapp' },
    { name: 'Avisos', Component: AvisosPage, permissao: 'configuracoes', requerRecurso: null },
  ];

  const ActiveComponent = tabsConfig[tabIndex]?.Component

  return (
    <MenuLayout>
      <div className="p-8">
        <Tab.Group selectedIndex={tabIndex} onChange={handleTabChange}>
          <Tab.List className="flex space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {tabsConfig.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `px-4 py-2 font-semibold rounded-md focus:outline-none whitespace-nowrap ${
                    selected
                      ? 'bg-black text-white shadow'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`
                }
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="mt-6">
            {tabsConfig.map((tab, idx) => (
              <Tab.Panel key={tab.name}>
                {idx === tabIndex && ActiveComponent ? <ActiveComponent embedded /> : null}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
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