'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MenuLayout from '@/components/MenuLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import SortableItem from '@/components/SortableItem'

export default function StatusPage() {
  const [customStatusOS, setCustomStatusOS] = useState<{ nome: string; cor: string }[]>([])
  const [newStatusOS, setNewStatusOS] = useState('')
  const [newCorOS, setNewCorOS] = useState('#000000')
  const [customStatusTec, setCustomStatusTec] = useState<{ nome: string; cor: string }[]>([])
  const [newStatusTec, setNewStatusTec] = useState('')
  const [newCorTec, setNewCorTec] = useState('#000000')

  useEffect(() => {
    const fetchStatuses = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      const { data: empresaData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', userId)
        .single()

      const empresa_id = empresaData?.empresa_id

      const { data: osCustom, error: osError } = await supabase
        .from('status')
        .select('nome, cor')
        .eq('tipo', 'os')
        .eq('empresa_id', empresa_id)

      const { data: tecCustom, error: tecError } = await supabase
        .from('status')
        .select('nome, cor')
        .eq('tipo', 'tecnico')
        .eq('empresa_id', empresa_id)

      const { data: osFixo } = await supabase
        .from('status_fixo')
        .select('nome, cor')
        .eq('tipo', 'os')

      const { data: tecFixo } = await supabase
        .from('status_fixo')
        .select('nome, cor')
        .eq('tipo', 'tecnico')

      if (osCustom && osFixo) setCustomStatusOS([...osFixo, ...osCustom])
      if (tecCustom && tecFixo) setCustomStatusTec([...tecFixo, ...tecCustom])
    }

    fetchStatuses()
  }, [])

  return (
    <MenuLayout>
      <div className="max-w-5xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Status da OS e Técnicos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 shadow-sm bg-white">
              <h2 className="text-lg font-semibold mb-3">Status da Ordem de Serviço</h2>
              <DndContext
                sensors={useSensors(
                  useSensor(PointerSensor),
                  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
                )}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={({ active, over }) => {
                  if (active.id !== over?.id) {
                    const oldIndex = customStatusOS.findIndex((item) => item.nome === active.id)
                    const newIndex = customStatusOS.findIndex((item) => item.nome === over?.id)
                    setCustomStatusOS(arrayMove(customStatusOS, oldIndex, newIndex))
                  }
                }}
              >
                <SortableContext items={customStatusOS.map((s) => s.nome)} strategy={verticalListSortingStrategy}>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
                    {customStatusOS.map((status, idx) => (
                      <SortableItem key={status.nome} id={status.nome}>
                        <li className="flex items-center gap-2 text-sm">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.cor }} />
                          {status.nome}
                        </li>
                      </SortableItem>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCorOS}
                  onChange={(e) => setNewCorOS(e.target.value)}
                  className="h-8 w-12 border rounded"
                  title="Escolha uma cor"
                />
                <input
                  value={newStatusOS}
                  onChange={(e) => setNewStatusOS(e.target.value)}
                  placeholder="Novo status"
                  className="flex-1 border rounded px-3 py-1 text-sm"
                />
                <button
                  onClick={async () => {
                    if (newStatusOS.trim()) {
                      const { data: userData } = await supabase.auth.getUser()
                      const userId = userData?.user?.id

                      const { data: empresaData } = await supabase
                        .from('usuarios')
                        .select('empresa_id')
                        .eq('auth_user_id', userId)
                        .single()

                      if (!empresaData) return alert('Empresa não encontrada.')

                      const { error } = await supabase
                        .from('status')
                        .insert({
                          nome: newStatusOS.trim(),
                          tipo: 'os',
                          cor: newCorOS,
                          empresa_id: empresaData.empresa_id,
                        })

                      if (!error) {
                        setCustomStatusOS([...customStatusOS, { nome: newStatusOS.trim(), cor: newCorOS }])
                        setNewStatusOS('')
                      }
                    }
                  }}
                  className="py-1 px-3 bg-black text-white rounded hover:bg-zinc-800 text-sm"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Os status fixos não podem ser removidos.
              </p>
            </div>

            <div className="border rounded-lg p-6 shadow-sm bg-white">
              <h2 className="text-lg font-semibold mb-3">Status do Técnico</h2>
              <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
                {customStatusTec.map((status, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.cor }} />
                    {status.nome}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCorTec}
                  onChange={(e) => setNewCorTec(e.target.value)}
                  className="h-8 w-12 border rounded"
                  title="Escolha uma cor"
                />
                <input
                  value={newStatusTec}
                  onChange={(e) => setNewStatusTec(e.target.value)}
                  placeholder="Novo status"
                  className="flex-1 border rounded px-3 py-1 text-sm"
                />
                <button
                  onClick={async () => {
                    if (newStatusTec.trim()) {
                      const { data: userData } = await supabase.auth.getUser()
                      const userId = userData?.user?.id

                      const { data: empresaData } = await supabase
                        .from('usuarios')
                        .select('empresa_id')
                        .eq('auth_user_id', userId)
                        .single()

                      if (!empresaData) return alert('Empresa não encontrada.')

                      const { error } = await supabase
                        .from('status')
                        .insert({
                          nome: newStatusTec.trim(),
                          tipo: 'tecnico',
                          cor: newCorTec,
                          empresa_id: empresaData.empresa_id,
                        })

                      if (!error) {
                        setCustomStatusTec([...customStatusTec, { nome: newStatusTec.trim(), cor: newCorTec }])
                        setNewStatusTec('')
                      }
                    }
                  }}
                  className="py-1 px-3 bg-black text-white rounded hover:bg-zinc-800 text-sm"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Os status fixos não podem ser removidos.
              </p>
            </div>
          </CardContent>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-6">
              Os status personalizados ainda não são persistidos no banco.
            </p>
          </CardContent>
        </Card>
      </div>  
    </MenuLayout>
  )
}