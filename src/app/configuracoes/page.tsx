'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tab } from '@headlessui/react'
import MenuLayout from '@/components/MenuLayout'
import EmpresaPage from './empresa/page'
import UsuariosPage from './usuarios/page'
import TermosPage from './termos/page'
import StatusPage from './status/page'

export default function ConfiguracoesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  return (
    <MenuLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Configurações Gerais</h1>

        <Tab.Group selectedIndex={tabIndex} onChange={handleTabChange}>
          <Tab.List className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            {['Empresa', 'Usuários', 'Termos de Garantia', 'Status'].map((tab) => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  `px-4 py-2 font-semibold rounded-md focus:outline-none ${
                    selected
                      ? 'bg-black text-white shadow'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`
                }
              >
                {tab}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="mt-6">
            <Tab.Panel><EmpresaPage /></Tab.Panel>
            <Tab.Panel><UsuariosPage /></Tab.Panel>
            <Tab.Panel><TermosPage /></Tab.Panel>
            <Tab.Panel><StatusPage /></Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </MenuLayout>
  )
}