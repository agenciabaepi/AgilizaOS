'use client'

import {
  Pencil,
  Trash2,
  UserPlus,
  Users,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { FiAlertTriangle } from 'react-icons/fi';
import { ToastProvider, useToast } from '@/components/Toast';
import { ConfirmProvider, useConfirm } from '@/components/ConfirmDialog';
import { mask as masker } from 'remask';

function UsuariosPageInner() {
  const { session, usuarioData } = useAuth()
  const router = useRouter();
  const { carregarLimites, limites, podeCriar, assinatura, isTrialExpired } = useSubscription();
  const { addToast, showModal } = useToast();
  const confirm = useConfirm();
  const { podeAcessar } = useConfigPermission('usuarios');
  
  // Estados do formulário
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [nivel, setNivel] = useState('tecnico')
  const [usuario, setUsuario] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  
  // Estados de validação
  const [emailValido, setEmailValido] = useState(true)
  const [cpfValido, setCpfValido] = useState(true)
  const [usuarioValido, setUsuarioValido] = useState(true)
  const [whatsappValido, setWhatsappValido] = useState(true)
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados da lista
  const [usuarios, setUsuarios] = useState<Array<{
    id: string
    nome: string
    email: string
    cpf: string
    whatsapp: string
    nivel: string
    auth_user_id: string
  }>>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  // Função para validar CPF
  const validarCPF = (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpfLimpo)) return false;
    
    // Validar primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    const dv1 = resto < 2 ? 0 : resto;
    
    // Validar segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    const dv2 = resto < 2 ? 0 : resto;
    
    return cpfLimpo.charAt(9) === dv1.toString() && cpfLimpo.charAt(10) === dv2.toString();
  };

  // Função para validar email
  const validarEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para validar usuário único
  const validarUsuarioUnico = async (usuario: string) => {
    if (!usuario.trim() || !empresaId) return false;
    
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('id')
        .eq('usuario', usuario.trim().toLowerCase())
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      return !data; // Retorna true se não existir (válido)
    } catch {
      return true; // Se não encontrar, é válido
    }
  };

  // Função para validar email único
  const validarEmailUnico = async (email: string) => {
    if (!email.trim() || !empresaId) return false;
    
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      return !data; // Retorna true se não existir (válido)
    } catch {
      return true; // Se não encontrar, é válido
    }
  };

  // Função para validar CPF único
  const validarCPFUnico = async (cpf: string) => {
    if (!cpf.trim() || !empresaId) return false;
    
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('id')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      return !data; // Retorna true se não existir (válido)
    } catch {
      return true; // Se não encontrar, é válido
    }
  };

  // Função para validar WhatsApp único
  const validarWhatsAppUnico = async (whatsapp: string) => {
    if (!whatsapp.trim()) return true; // WhatsApp é opcional
    
    try {
      const whatsappNormalizado = whatsapp.replace(/\D/g, ''); // Remove tudo que não é número
      
      // Buscar todos os usuários com WhatsApp e verificar se algum tem o mesmo número normalizado
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, whatsapp')
        .not('whatsapp', 'is', null)
        .neq('whatsapp', '');
      
      if (error) {
        console.warn('⚠️ Erro na validação de WhatsApp:', error);
        return true; // Assumir válido em caso de erro
      }
      
      if (!data || data.length === 0) return true; // Se não há usuários, é válido
      
      // Verificar se algum usuário tem o mesmo número normalizado
      const whatsappJaExiste = data.some(u => {
        if (!u.whatsapp) return false;
        const dbWhatsappNormalizado = u.whatsapp.replace(/\D/g, '');
        // Comparar números normalizados (com e sem código do país)
        return dbWhatsappNormalizado === whatsappNormalizado ||
               dbWhatsappNormalizado === whatsappNormalizado.replace(/^55/, '') ||
               `55${dbWhatsappNormalizado}` === whatsappNormalizado ||
               dbWhatsappNormalizado.replace(/^55/, '') === whatsappNormalizado.replace(/^55/, '');
      });
      
      return !whatsappJaExiste; // Retorna true se não existir (válido)
    } catch {
      return true; // Se não encontrar, é válido
    }
  };

  // Validação em tempo real
  useEffect(() => {
    if (email) {
      const emailFormatValido = validarEmail(email);
      
      if (!emailFormatValido) {
        setEmailValido(false);
        return;
      }
      
      // Verificar se email já existe apenas se o formato for válido
      validarEmailUnico(email).then((emailUnico) => {
        setEmailValido(emailUnico);
      });
    } else {
      setEmailValido(true);
    }
  }, [email, empresaId]);

  useEffect(() => {
    if (cpf) {
      const cpfFormatValido = validarCPF(cpf);
      
      if (!cpfFormatValido) {
        setCpfValido(false);
        return;
      }
      
      // Verificar se CPF já existe apenas se o formato for válido
      validarCPFUnico(cpf).then((cpfUnico) => {
        setCpfValido(cpfUnico);
      });
    } else {
      setCpfValido(true); // CPF vazio é válido (não obrigatório)
    }
  }, [cpf, empresaId]);


  useEffect(() => {
    if (usuario) {
      validarUsuarioUnico(usuario).then(setUsuarioValido);
    } else {
      setUsuarioValido(true);
    }
  }, [usuario, empresaId]);

  useEffect(() => {
    if (whatsapp) {
      validarWhatsAppUnico(whatsapp).then(setWhatsappValido);
    } else {
      setWhatsappValido(true); // WhatsApp vazio é válido (opcional)
    }
  }, [whatsapp]);

  const fetchUsuarios = async () => {
    try {
      if (!session?.user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const {
        data: meuUsuario,
        error: erroUsuario,
      } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', session.user.id)
        .single()

      if (erroUsuario) throw erroUsuario
      setEmpresaId(meuUsuario?.empresa_id)

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, cpf, whatsapp, nivel, auth_user_id')
        .eq('empresa_id', meuUsuario?.empresa_id)

      if (error) throw error

      const usuariosFiltrados = data.filter((u: { auth_user_id: string }) => u.auth_user_id !== session?.user?.id)
      setUsuarios(usuariosFiltrados)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      addToast('error', 'Erro ao carregar lista de usuários');
    }
  }

  const handleDeleteUsuario = async (id: string, authUserId?: string) => {
    if (authUserId === session?.user?.id) {
      addToast('error', 'Você não pode excluir seu próprio usuário.');
      return;
    }

    const confirmar = await confirm({
      title: 'Excluir Usuário',
      message: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmar) return;

    try {
      // Pegar o token de sessão
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        addToast('error', 'Usuário não autenticado');
        return;
      }
      
      const response = await fetch('/api/usuarios/excluir', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      })

      const data = await response.json()
      
      // Verificar se é erro de foreign key constraint ANTES de verificar response.ok
      if (!response.ok && (data.code === 'FOREIGN_KEY_CONSTRAINT' || response.status === 409)) {
        // Erro esperado: dados vinculados - mostrar APENAS modal no centro da tela (sem toast)
        showModal({
          title: 'Não é possível excluir este usuário',
          message: data.error || 'Este usuário possui dados vinculados e não pode ser excluído.',
          confirmLabel: 'Entendi',
          type: 'warning',
          onClose: () => {}
        })
        return // Retornar aqui para não executar código abaixo nem entrar no catch
      }
      
      if (!response.ok) {
        // Outros erros: mostrar toast de erro
        const errorMessage = data.error || `Erro ao excluir usuário (${response.status})`
        addToast('error', errorMessage)
        return
      }

      // Sucesso
      addToast('success', 'Usuário excluído com sucesso!');
      fetchUsuarios()
      carregarLimites()
    } catch (error: unknown) {
      // Apenas para erros de rede ou exceções inesperadas (não para foreign key constraint)
      // Verificar se o erro NÃO é de foreign key constraint antes de mostrar toast
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      // Não mostrar toast se for erro de foreign key (já deve ter sido tratado acima)
      if (errorMessage.includes('foreign key') || errorMessage.includes('dados vinculados')) {
        return
      }
      
      console.error('Erro ao excluir usuário:', errorMessage)
      addToast('error', 'Erro ao excluir usuário: ' + errorMessage);
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchUsuarios()
    }
  }, [session])

  // Se não tem permissão, mostrar mensagem
  if (!podeAcessar) {
    return <AcessoNegadoComponent />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações finais
    if (!emailValido) {
      addToast('error', 'E-mail inválido ou já cadastrado');
      return;
    }
    
    if (!cpfValido) {
      addToast('error', 'CPF inválido ou já cadastrado');
      return;
    }
    
    if (!usuarioValido) {
      addToast('error', 'Nome de usuário já existe');
      return;
    }

    if (!whatsappValido) {
      addToast('error', 'Este número de WhatsApp já está cadastrado em outra conta');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const usuarioPadronizado = usuario.trim().toLowerCase();
      const payload = {
        nome,
        email,
        senha,
        cpf: cpf.trim() || null, // Enviar null se CPF estiver vazio
        whatsapp,
        nivel,
        empresa_id: empresaId,
        usuario: usuarioPadronizado,
      };
      
      const response = await fetch('/api/usuarios/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
        } catch (parseError) {
        data = { raw: text };
      }
      
      if (!response.ok) {
        console.error('Erro detalhado:', data);
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        throw new Error(data.error || data.message || data.raw || `Erro ao cadastrar usuário (${response.status}).`);
      }

      addToast('success', 'Usuário cadastrado com sucesso!');
      
      // Limpar formulário
      setNome('')
      setEmail('')
      setSenha('')
      setCpf('')
      setWhatsapp('')
      setNivel('tecnico')
      setUsuario('')
      setMostrarFormulario(false)

      // Atualiza lista e limites
      fetchUsuarios()
      carregarLimites()
    } catch (error: unknown) {
      addToast('error', error instanceof Error ? error.message : 'Erro desconhecido ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Verificar se está no trial e não pode criar usuários
  const isTrial = assinatura?.status === 'trial' && !isTrialExpired();
  const cannotCreateUsers = isTrial && limites && !podeCriar('usuarios');

  return (
    <main className="p-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-900 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold text-gray-900">
                    Gerenciar Usuários
                  </CardTitle>
                  <p className="text-gray-600 text-sm mt-1">
                    Aqui você poderá adicionar, editar e remover usuários vinculados à empresa.
                  </p>
                </div>
              </div>
              
              {!cannotCreateUsers && (
                <button
                  onClick={() => setMostrarFormulario(!mostrarFormulario)}
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <UserPlus className="w-4 h-4" />
                  {mostrarFormulario ? 'Cancelar' : '+ Adicionar usuário'}
                </button>
              )}
            </div>
            
            {/* Aviso único quando limite for atingido */}
            {cannotCreateUsers && (
              <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <FiAlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-amber-800 font-semibold text-sm">
                    Limite de usuários atingido
                  </span>
                </div>
                <p className="text-amber-700 text-sm mb-4">
                  Para criar mais usuários, escolha um plano adequado às suas necessidades.
                </p>
                <button 
                  onClick={() => window.location.href = '/planos'}
                  className="bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-md"
                >
                  Ver planos disponíveis
                </button>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-6">
            {mostrarFormulario && !cannotCreateUsers && (
              <div className="mb-8 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Cadastrar Novo Usuário
                </h3>
                
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Nome Completo *
                      </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                        placeholder="Digite o nome completo"
                      required
                    />
                  </div>

                    {/* Usuário */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Nome de Usuário *
                      </label>
                      <div className="relative">
                    <input
                      type="text"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                          className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                            usuarioValido 
                              ? 'border-gray-300 focus:ring-gray-900' 
                              : 'border-red-500 focus:ring-red-500'
                          }`}
                          placeholder="Digite o nome de usuário"
                      required
                    />
                        {usuario && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {usuarioValido ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {usuario && !usuarioValido && (
                        <p className="text-red-500 text-xs">Nome de usuário já existe</p>
                      )}
                  </div>

                    {/* E-mail */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        E-mail *
                      </label>
                      <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                          className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                            emailValido 
                              ? 'border-gray-300 focus:ring-gray-900' 
                              : 'border-red-500 focus:ring-red-500'
                          }`}
                          placeholder="Digite o e-mail"
                      required
                    />
                        {email && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {emailValido ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {email && !emailValido && (
                        <p className="text-red-500 text-xs">
                          {!validarEmail(email) ? 'E-mail inválido' : 'E-mail já cadastrado'}
                        </p>
                      )}
                  </div>

                    {/* Senha */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Senha *
                      </label>
                      <div className="relative">
                    <input
                          type={senhaVisivel ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 pr-12"
                          placeholder="Digite a senha"
                      required
                    />
                        <button
                          type="button"
                          onClick={() => setSenhaVisivel(!senhaVisivel)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {senhaVisivel ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                  </div>

                    {/* CPF */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        CPF
                      </label>
                      <div className="relative">
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                          className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                            cpfValido 
                              ? 'border-gray-300 focus:ring-gray-900' 
                              : 'border-red-500 focus:ring-red-500'
                          }`}
                          placeholder="000.000.000-00 (opcional)"
                        />
                        {cpf && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {cpfValido ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {cpf && !cpfValido && (
                        <p className="text-red-500 text-xs">
                          {!validarCPF(cpf) ? 'CPF inválido' : 'CPF já cadastrado'}
                        </p>
                      )}
                  </div>

                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        WhatsApp
                      </label>
                      <div className="relative">
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setWhatsapp(masker(raw, ['(99) 99999-9999']));
                      }}
                        className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          whatsappValido 
                            ? 'border-gray-300 focus:ring-gray-900' 
                            : 'border-red-500 focus:ring-red-500'
                        }`}
                        placeholder="(99) 99999-9999"
                        maxLength={15}
                    />
                        {whatsapp && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {whatsappValido ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {whatsapp && !whatsappValido && (
                        <p className="text-red-500 text-xs">Este número de WhatsApp já está cadastrado em outra conta</p>
                      )}
                  </div>

                    {/* Nível */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Nível de Acesso *
                      </label>
                    <select
                      value={nivel}
                      onChange={(e) => setNivel(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="tecnico">Técnico</option>
                      <option value="atendente">Atendente</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setMostrarFormulario(false)}
                      className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
                    >
                      Cancelar
                    </button>
                <button
                  type="submit"
                      disabled={isSubmitting || !emailValido || !cpfValido || !usuarioValido || !whatsappValido}
                      className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Cadastrar Usuário
                        </>
                      )}
                </button>
                  </div>
              </form>
              </div>
            )}

            {/* Lista de Usuários */}
            {empresaId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Usuários Cadastrados ({usuarios.length})
                </h3>
                
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="flex items-center justify-between p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-full font-semibold text-lg shadow-md">
                        {usuario.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{usuario.nome}</p>
                        <p className="text-sm text-gray-600">{usuario.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            usuario.nivel === 'admin' ? 'bg-red-100 text-red-800' :
                            usuario.nivel === 'financeiro' ? 'bg-blue-100 text-blue-800' :
                            usuario.nivel === 'atendente' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {usuario.nivel.charAt(0).toUpperCase() + usuario.nivel.slice(1)}
                          </span>
                          {usuario.whatsapp && (
                            <span className="text-xs text-gray-500">
                              📱 {usuario.whatsapp}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        title="Editar"
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          usuario.auth_user_id === session?.user?.id 
                            ? 'opacity-40 cursor-not-allowed bg-gray-100' 
                            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        onClick={() => {
                          if (usuario.auth_user_id !== session?.user?.id) {
                            router.push(`/configuracoes/usuarios/${usuario.id}/editar`)
                          }
                        }}
                        disabled={usuario.auth_user_id === session?.user?.id}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      
                      <button
                        title="Excluir"
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          usuario.auth_user_id === session?.user?.id 
                            ? 'opacity-40 cursor-not-allowed bg-gray-100' 
                            : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                        }`}
                        onClick={() => {
                          if (usuario.auth_user_id !== session?.user?.id) {
                            handleDeleteUsuario(usuario.id, usuario.auth_user_id)
                          }
                        }}
                        disabled={usuario.auth_user_id === session?.user?.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {usuarios.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Nenhum usuário cadastrado</p>
                    <p className="text-sm">Comece adicionando o primeiro usuário da sua empresa</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
  )
}

export default function UsuariosPage() {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <UsuariosPageInner />
      </ToastProvider>
    </ConfirmProvider>
  );
}