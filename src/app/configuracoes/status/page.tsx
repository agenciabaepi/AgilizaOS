
'use client';

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MenuLayout from '@/components/MenuLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

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
import ProtectedRoute from '@/components/ProtectedRoute'

export default function StatusPage() {
  const [customStatusOS, setCustomStatusOS] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [statusFixoOS, setStatusFixoOS] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [newStatusOS, setNewStatusOS] = useState('')
  const [newCorOS, setNewCorOS] = useState('#000000')
  const [customStatusTec, setCustomStatusTec] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [statusFixoTec, setStatusFixoTec] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [newStatusTec, setNewStatusTec] = useState('')
  const [newCorTec, setNewCorTec] = useState('#000000')
  // Estados para edição inline
  const [editandoIdOS, setEditandoIdOS] = useState<string | null>(null)
  const [editandoStatusOS, setEditandoStatusOS] = useState<string>('')
  const [editandoIdTec, setEditandoIdTec] = useState<string | null>(null)
  const [editandoStatusTec, setEditandoStatusTec] = useState<string>('')

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
        .select('id, nome, cor')
        .eq('tipo', 'os')
        .eq('empresa_id', empresa_id)
        .order('ordem', { ascending: true })

      const { data: tecCustom, error: tecError } = await supabase
        .from('status')
        .select('id, nome, cor')
        .eq('tipo', 'tecnico')
        .eq('empresa_id', empresa_id)
        .order('ordem', { ascending: true })

      const { data: osFixo } = await supabase
        .from('status_fixo')
        .select('id, nome, cor')
        .eq('tipo', 'os')
        .order('ordem', { ascending: true })

      const { data: tecFixo } = await supabase
        .from('status_fixo')
        .select('id, nome, cor')
        .eq('tipo', 'tecnico')
        .order('ordem', { ascending: true })

      if (osCustom) setCustomStatusOS(osCustom)
      if (tecCustom) setCustomStatusTec(tecCustom)
      if (osFixo) setStatusFixoOS(osFixo)
      if (tecFixo) setStatusFixoTec(tecFixo)
    }

    fetchStatuses()
  }, [])

  // Manipuladores para editar e excluir status personalizados
  const handleDeleteStatus = async (id: string, tipo: 'os' | 'tecnico') => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data: empresaData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', userId)
      .single();

    if (!empresaData) return alert('Empresa não encontrada.');

    const confirmDelete = window.confirm('Tem certeza que deseja excluir este status? Essa ação não poderá ser desfeita.');
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('status')
      .delete()
      .match({ id, empresa_id: empresaData.empresa_id, tipo });

    if (!error) {
      if (tipo === 'os') {
        setCustomStatusOS((prev) => prev.filter((s) => s.id !== id));
      } else {
        setCustomStatusTec((prev) => prev.filter((s) => s.id !== id));
      }
    } else {
      alert('Erro ao excluir o status. Tente novamente.');
    }
  };

  // Altera o modo de edição para inline, preenchendo os campos e sincronizando corretamente
  const handleEditStatus = (id: string, nome: string, cor: string, tipo: 'os' | 'tecnico') => {
    if (tipo === 'os') {
      setEditandoIdOS(id);
      setEditandoStatusOS(nome);
      setNewStatusOS(nome);
      setNewCorOS(cor);
      setEditandoIdTec(null);
      setEditandoStatusTec('');
    } else {
      setEditandoIdTec(id);
      setEditandoStatusTec(nome);
      setNewStatusTec(nome);
      setNewCorTec(cor);
      setEditandoIdOS(null);
      setEditandoStatusOS('');
    }
  }


  return (
    <ProtectedRoute allowedLevels={['admin', 'tecnico', 'financeiro']}>
    <MenuLayout>
      <div className="max-w-5xl mx-auto py-6">
        <Card className="bg-white border border-zinc-200 shadow-none">
          <CardHeader>
            <h2 className="text-xl font-bold text-zinc-800">Status da OS e Técnicos</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-white border border-zinc-200 shadow-none p-0">
              <CardHeader className="px-0 pb-2">
                <h2 className="text-xl font-bold text-zinc-800">Status da Ordem de Serviço</h2>
                <p className="text-sm text-muted-foreground -mt-2 mb-2">Arraste os itens para reorganizar a ordem dos status.</p>
              </CardHeader>
              <CardContent className="px-0 pt-0 space-y-4">
                <DndContext
                  sensors={useSensors(
                    useSensor(PointerSensor),
                    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
                  )}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={async ({ active, over }) => {
                    if (active.id !== over?.id) {
                      // Junta os arrays dos status fixos e customizados
                      const allStatus = [...statusFixoOS, ...customStatusOS]
                      const oldIndex = allStatus.findIndex((item) => item.id === active.id)
                      const newIndex = allStatus.findIndex((item) => item.id === over?.id)
                      const reordered = arrayMove(allStatus, oldIndex, newIndex)

                      // Atualiza os estados locais para refletir a nova ordem
                      setStatusFixoOS(reordered.filter((s) => statusFixoOS.find((f) => f.id === s.id)))
                      setCustomStatusOS(reordered.filter((s) => customStatusOS.find((c) => c.id === s.id)))

                      // Atualiza ordem no banco para ambos status_fixo e status
                      const { data: userData } = await supabase.auth.getUser()
                      const userId = userData?.user?.id
                      const { data: empresaData } = await supabase
                        .from('usuarios')
                        .select('empresa_id')
                        .eq('auth_user_id', userId)
                        .single()

                      const empresa_id = empresaData?.empresa_id

                      for (let i = 0; i < reordered.length; i++) {
                        const status = reordered[i]
                        const table = statusFixoOS.find((s) => s.id === status.id) ? 'status_fixo' : 'status'
                        let query = supabase
                          .from(table)
                          .update({ ordem: i })
                          .eq('id', status.id)
                          .eq('tipo', 'os')
                        if (table === 'status') {
                          query = query.eq('empresa_id', empresa_id)
                        }
                        await query.maybeSingle()
                      }
                    }
                  }}
                >
                  <SortableContext
                    items={[...statusFixoOS, ...customStatusOS].map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-4">
                      {[...statusFixoOS, ...customStatusOS].map((status) => {
                        const isCustom = customStatusOS.some((s) => s.id === status.id)
                        return (
                          <SortableItem key={status.id} id={status.id}>
                            <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-4 py-3 shadow-sm transition-shadow hover:shadow-md cursor-move">
                              <div className="flex items-center gap-3">
                                <span className="h-5 w-5 rounded-full border border-zinc-300" style={{ backgroundColor: status.cor }} />
                                <span className="text-sm text-zinc-900">{status.nome}</span>
                              </div>
                              <div className="flex items-center">
                                {isCustom && (
                                  <>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEditStatus(status.id, status.nome, status.cor, 'os');
                                      }}
                                      className="text-sm text-blue-600 hover:underline"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteStatus(status.id, 'os');
                                      }}
                                      className="text-sm text-red-600 hover:underline ml-2"
                                    >
                                      Excluir
                                    </button>
                                  </>
                                )}
                                <div className="text-zinc-400 text-lg font-bold select-none ml-3">☰</div>
                              </div>
                            </div>
                          </SortableItem>
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCorOS}
                    onChange={(e) => setNewCorOS(e.target.value)}
                    className="h-8 w-12 rounded-md border border-zinc-300 shadow-sm focus:outline-none focus:border-black"
                    title="Escolha uma cor"
                  />
                  <input
                    value={newStatusOS}
                    onChange={(e) => setNewStatusOS(e.target.value)}
                    placeholder="Novo status"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-black"
                  />
                  <button
                    onMouseDown={async (e) => {
                      e.preventDefault();
                      const isEditing = !!editandoIdOS;
                      if (isEditing) {
                        // Atualizar status existente
                        if (!newStatusOS.trim()) return;
                        const { data: userData } = await supabase.auth.getUser();
                        const userId = userData?.user?.id;
                        const { data: empresaData } = await supabase
                          .from('usuarios')
                          .select('empresa_id')
                          .eq('auth_user_id', userId)
                          .single();
                        if (!empresaData) return alert('Empresa não encontrada.');
                        const { error } = await supabase
                          .from('status')
                          .update({ nome: newStatusOS.trim(), cor: newCorOS })
                          .eq('id', editandoIdOS)
                          .eq('empresa_id', empresaData.empresa_id)
                          .eq('tipo', 'os');
                        if (!error) {
                          setCustomStatusOS((prev) =>
                            prev.map((s) =>
                              s.id === editandoIdOS
                                ? { ...s, nome: newStatusOS.trim(), cor: newCorOS }
                                : s
                            )
                          );
                          setEditandoIdOS(null);
                          setEditandoStatusOS('');
                          setNewStatusOS('');
                          setNewCorOS('#000000');
                        }
                      } else if (newStatusOS.trim()) {
                        // Inserir novo status
                        const { data: userData } = await supabase.auth.getUser();
                        const userId = userData?.user?.id;
                        const { data: empresaData } = await supabase
                          .from('usuarios')
                          .select('empresa_id')
                          .eq('auth_user_id', userId)
                          .single();
                        if (!empresaData) return alert('Empresa não encontrada.');
                        const { data, error } = await supabase
                          .from('status')
                          .insert({
                            nome: newStatusOS.trim(),
                            tipo: 'os',
                            cor: newCorOS,
                            empresa_id: empresaData.empresa_id,
                          })
                          .select('id, nome, cor')
                          .single();
                        if (!error && data) {
                          setCustomStatusOS([...customStatusOS, data]);
                          setNewStatusOS('');
                          setNewCorOS('#000000');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-black text-white rounded-md font-semibold shadow-sm hover:bg-zinc-800 transition-colors text-sm"
                  >
                    {editandoIdOS ? 'Atualizar' : 'Adicionar'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Os status fixos não podem ser removidos.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-none p-0">
              <CardHeader className="px-0 pb-2">
                <h2 className="text-xl font-bold text-zinc-800">Status do Técnico</h2>
                <p className="text-sm text-muted-foreground -mt-2 mb-2">Arraste os itens para reorganizar a ordem dos status.</p>
              </CardHeader>
              <CardContent className="px-0 pt-0 space-y-4">
                <DndContext
                  sensors={useSensors(
                    useSensor(PointerSensor),
                    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
                  )}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={async ({ active, over }) => {
                    if (active.id !== over?.id) {
                      // Junta os arrays dos status fixos e customizados
                      const allStatus = [...statusFixoTec, ...customStatusTec]
                      const oldIndex = allStatus.findIndex((item) => item.id === active.id)
                      const newIndex = allStatus.findIndex((item) => item.id === over?.id)
                      const reordered = arrayMove(allStatus, oldIndex, newIndex)

                      // Atualiza os estados locais para refletir a nova ordem
                      setStatusFixoTec(reordered.filter((s) => statusFixoTec.find((f) => f.id === s.id)))
                      setCustomStatusTec(reordered.filter((s) => customStatusTec.find((c) => c.id === s.id)))

                      // Atualiza ordem no banco para ambos status_fixo e status
                      const { data: userData } = await supabase.auth.getUser()
                      const userId = userData?.user?.id
                      const { data: empresaData } = await supabase
                        .from('usuarios')
                        .select('empresa_id')
                        .eq('auth_user_id', userId)
                        .single()

                      const empresa_id = empresaData?.empresa_id

                      for (let i = 0; i < reordered.length; i++) {
                        const status = reordered[i]
                        const table = statusFixoTec.find((s) => s.id === status.id) ? 'status_fixo' : 'status'
                        let query = supabase
                          .from(table)
                          .update({ ordem: i })
                          .eq('id', status.id)
                          .eq('tipo', 'tecnico')
                        if (table === 'status') {
                          query = query.eq('empresa_id', empresa_id)
                        }
                        await query.maybeSingle()
                      }
                    }
                  }}
                >
                  <SortableContext
                    items={[...statusFixoTec, ...customStatusTec].map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-4">
                      {[...statusFixoTec, ...customStatusTec].map((status) => {
                        const isCustom = customStatusTec.some((s) => s.id === status.id)
                        return (
                          <SortableItem key={status.id} id={status.id}>
                            <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-4 py-3 shadow-sm transition-shadow hover:shadow-md cursor-move">
                              <div className="flex items-center gap-3">
                                <span className="h-5 w-5 rounded-full border border-zinc-300" style={{ backgroundColor: status.cor }} />
                                <span className="text-sm text-zinc-900">{status.nome}</span>
                              </div>
                              <div className="flex items-center">
                                {isCustom && (
                                  <>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEditStatus(status.id, status.nome, status.cor, 'tecnico');
                                      }}
                                      className="text-sm text-blue-600 hover:underline"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteStatus(status.id, 'tecnico');
                                      }}
                                      className="text-sm text-red-600 hover:underline ml-2"
                                    >
                                      Excluir
                                    </button>
                                  </>
                                )}
                                <div className="text-zinc-400 text-lg font-bold select-none ml-3">☰</div>
                              </div>
                            </div>
                          </SortableItem>
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCorTec}
                    onChange={(e) => setNewCorTec(e.target.value)}
                    className="h-8 w-12 rounded-md border border-zinc-300 shadow-sm focus:outline-none focus:border-black"
                    title="Escolha uma cor"
                  />
                  <input
                    value={newStatusTec}
                    onChange={(e) => setNewStatusTec(e.target.value)}
                    placeholder="Novo status"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-black"
                  />
                  <button
                    onMouseDown={async (e) => {
                      e.preventDefault();
                      const isEditing = !!editandoIdTec;
                      if (isEditing) {
                        // Atualizar status existente
                        if (!newStatusTec.trim()) return;
                        const { data: userData } = await supabase.auth.getUser();
                        const userId = userData?.user?.id;
                        const { data: empresaData } = await supabase
                          .from('usuarios')
                          .select('empresa_id')
                          .eq('auth_user_id', userId)
                          .single();
                        if (!empresaData) return alert('Empresa não encontrada.');
                        const { error } = await supabase
                          .from('status')
                          .update({ nome: newStatusTec.trim(), cor: newCorTec })
                          .eq('id', editandoIdTec)
                          .eq('empresa_id', empresaData.empresa_id)
                          .eq('tipo', 'tecnico');
                        if (!error) {
                          setCustomStatusTec((prev) =>
                            prev.map((s) =>
                              s.id === editandoIdTec
                                ? { ...s, nome: newStatusTec.trim(), cor: newCorTec }
                                : s
                            )
                          );
                          setEditandoIdTec(null);
                          setEditandoStatusTec('');
                          setNewStatusTec('');
                          setNewCorTec('#000000');
                        }
                      } else if (newStatusTec.trim()) {
                        // Inserir novo status
                        const { data: userData } = await supabase.auth.getUser();
                        const userId = userData?.user?.id;
                        const { data: empresaData } = await supabase
                          .from('usuarios')
                          .select('empresa_id')
                          .eq('auth_user_id', userId)
                          .single();
                        if (!empresaData) return alert('Empresa não encontrada.');
                        const { data, error } = await supabase
                          .from('status')
                          .insert({
                            nome: newStatusTec.trim(),
                            tipo: 'tecnico',
                            cor: newCorTec,
                            empresa_id: empresaData.empresa_id,
                          })
                          .select('id, nome, cor')
                          .single();
                        if (!error && data) {
                          setCustomStatusTec([...customStatusTec, data]);
                          setNewStatusTec('');
                          setNewCorTec('#000000');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-black text-white rounded-md font-semibold shadow-sm hover:bg-zinc-800 transition-colors text-sm"
                  >
                    {editandoIdTec ? 'Atualizar' : 'Adicionar'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Os status fixos não podem ser removidos.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>  
    </MenuLayout>
    </ProtectedRoute>
  )
}