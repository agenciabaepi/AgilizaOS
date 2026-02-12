'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { 
  FiArrowLeft, 
  FiUser, 
  FiMail, 
  FiLock, 
  FiPhone, 
  FiShield,
  FiSave,
  FiX,
  FiCheck
} from 'react-icons/fi';
import { mask as masker } from 'remask';
import { User, Shield, Eye, EyeOff } from 'lucide-react';
import {
  PERMISSOES_PRINCIPAIS,
  PERMISSOES_FINANCEIRO,
  PERMISSOES_CONTATOS,
  PERMISSOES_PRODUTOS,
  PERMISSOES_CONFIGURACOES,
  PERMISSOES_AVANCADAS,
  getAllGrantableKeys,
} from '@/config/grantablePermissions';

function EditarUsuarioPageInner() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { session } = useAuth();
  const { podeAcessar } = useConfigPermission('usuarios');
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    usuario: '',
    senha: '',
    cpf: '',
    whatsapp: '',
    nivel: '',
    permissoes: [] as string[],
    auth_user_id: '',
  });

  // Estados de validação
  const [emailValido, setEmailValido] = useState(true);
  const [cpfValido, setCpfValido] = useState(true);
  const [usuarioValido, setUsuarioValido] = useState(true);
  
  // Estado para armazenar dados originais do usuário
  const [usuarioOriginal, setUsuarioOriginal] = useState<any>(null);

  // Função para validar CPF
  const validarCPF = (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return false;
    
    if (/^(\d)\1+$/.test(cpfLimpo)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let dv1 = resto < 2 ? 0 : resto;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let dv2 = resto < 2 ? 0 : resto;
    
    return cpfLimpo.charAt(9) === dv1.toString() && cpfLimpo.charAt(10) === dv2.toString();
  };

  // Função para validar email
  const validarEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para validar usuário único (excluindo o usuário atual)
  const validarUsuarioUnico = async (usuario: string) => {
    if (!usuario.trim()) return false;
    
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('usuario', usuario.trim().toLowerCase())
        .neq('id', userId)
        .single();
      
      return !data; // Retorna true se não existir (válido)
    } catch {
      return true; // Se não encontrar, é válido
    }
  };

  // Função para validar email único (excluindo o usuário atual)
  const validarEmailUnico = async (email: string) => {
    if (!email.trim()) return false;
    
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .neq('id', userId)
        .single();
      
      return !data; // Retorna true se não existir (válido)
    } catch {
      return true; // Se não encontrar, é válido
    }
  };

  // Função para validar CPF único (excluindo o usuário atual)
  const validarCPFUnico = async (cpf: string) => {
    if (!cpf.trim()) return false;
    
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .neq('id', userId)
        .single();
      
      return !data; // Retorna true se não existir (válido)
    } catch {
      return true; // Se não encontrar, é válido
    }
  };

  // Validação em tempo real
  useEffect(() => {
    if (form.email && usuarioOriginal) {
      const emailFormatoValido = validarEmail(form.email);
      
      if (!emailFormatoValido) {
        setEmailValido(false);
      } else {
        // Se o email não mudou, é válido
        if (form.email === usuarioOriginal.email) {
          setEmailValido(true);
        } else {
          // Só valida unicidade se o email mudou
          validarEmailUnico(form.email).then(setEmailValido);
        }
      }
    }
  }, [form.email, usuarioOriginal]);

  useEffect(() => {
    if (form.cpf) {
      const cpfValido = validarCPF(form.cpf);
      
      // Se o CPF for válido, verificar se já existe no banco
      if (cpfValido && form.cpf.trim()) {
        // Se o CPF não mudou, é válido
        if (usuarioOriginal && form.cpf === usuarioOriginal.cpf) {
          setCpfValido(true);
        } else {
          validarCPFUnico(form.cpf).then((cpfUnico) => {
            setCpfValido(cpfUnico); // true se único, false se duplicado
          });
        }
      } else {
        setCpfValido(cpfValido); // false se formato inválido
      }
    } else {
      setCpfValido(true); // CPF vazio é válido
    }
  }, [form.cpf, usuarioOriginal]);

  useEffect(() => {
    if (form.usuario && usuarioOriginal) {
      // Se o nome de usuário não mudou, é válido
      if (form.usuario === usuarioOriginal.usuario) {
        setUsuarioValido(true);
      } else {
        // Só valida se o nome de usuário mudou
        validarUsuarioUnico(form.usuario).then(setUsuarioValido);
      }
    }
  }, [form.usuario, userId, usuarioOriginal]);

  useEffect(() => {
    const fetchUsuario = async () => {
      if (!userId) return;
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(`/api/usuarios/${userId}`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          if (res.status === 404) {
            addToast('error', 'Usuário não encontrado');
            router.replace('/configuracoes/usuarios');
            return;
          }
          throw new Error(await res.text());
        }
        const usuarioData = await res.json();

        if (!usuarioData.nome || !usuarioData.email) {
          addToast('error', 'Dados do usuário incompletos ou inválidos');
          setLoading(false);
          return;
        }

        setUsuarioOriginal(usuarioData);
        setForm({
          nome: usuarioData.nome || '',
          email: usuarioData.email || '',
          usuario: (usuarioData.usuario ?? '').trim() || '',
          senha: '',
          cpf: usuarioData.cpf || '',
          whatsapp: usuarioData.whatsapp || '',
          nivel: usuarioData.nivel || '',
          permissoes: Array.isArray(usuarioData.permissoes) ? [...usuarioData.permissoes] : [],
          auth_user_id: usuarioData.auth_user_id || '',
        });
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        addToast('error', error instanceof Error ? error.message : 'Erro ao carregar usuário');
      } finally {
        setLoading(false);
      }
    };

    fetchUsuario();
  }, [userId, session?.access_token, addToast, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Preencher permissões padrão ao trocar nível
    if (name === 'nivel') {
      let permissoesPadrao: string[] = [];
      if (value === 'tecnico') {
        permissoesPadrao = ['dashboard', 'bancada', 'comissoes'];
      } else if (value === 'financeiro') {
        permissoesPadrao = ['dashboard', 'lembretes', 'clientes', 'ordens', 'equipamentos', 'financeiro', 'vendas', 'movimentacao-caixa', 'contas-a-pagar', 'lucro-desempenho', 'caixa'];
      } else if (value === 'atendente') {
        permissoesPadrao = ['dashboard', 'lembretes', 'clientes', 'ordens', 'equipamentos', 'caixa', 'catalogo'];
      } else if (value === 'admin') {
        permissoesPadrao = getAllGrantableKeys();
      }
      if (!permissoesPadrao.includes('dashboard')) {
        permissoesPadrao.push('dashboard');
      }
      setForm((prev) => ({ ...prev, permissoes: permissoesPadrao }));
    }
  };

  // Função para gerenciar permissões em cascata
  const handlePermissaoChange = (key: string) => {
    // ✅ PROTEÇÃO: Dashboard é permissão fixa e obrigatória
    if (key === 'dashboard') {
      addToast('warning', 'Dashboard é uma permissão obrigatória e não pode ser removida');
      return;
    }

    setForm((prev) => {
      const novasPermissoes = [...prev.permissoes];
      const permissaoAtual = novasPermissoes.includes(key);
      
      if (permissaoAtual) {
        // Desmarcando permissão principal
        const permissaoRemovida = novasPermissoes.filter((p) => p !== key);
        
        // ✅ GARANTIR: Dashboard sempre presente
        if (!permissaoRemovida.includes('dashboard')) {
          permissaoRemovida.push('dashboard');
        }
        
        if (key === PERMISSOES_FINANCEIRO.principal.key) {
          PERMISSOES_FINANCEIRO.sub.forEach(sub => {
            const i = permissaoRemovida.indexOf(sub.key);
            if (i > -1) permissaoRemovida.splice(i, 1);
          });
        }
        if (key === PERMISSOES_CONTATOS.principal.key) {
          PERMISSOES_CONTATOS.sub.forEach(sub => {
            const i = permissaoRemovida.indexOf(sub.key);
            if (i > -1) permissaoRemovida.splice(i, 1);
          });
        }
        if (key === PERMISSOES_PRODUTOS.principal.key) {
          PERMISSOES_PRODUTOS.sub.forEach(sub => {
            const i = permissaoRemovida.indexOf(sub.key);
            if (i > -1) permissaoRemovida.splice(i, 1);
          });
        }
        if (key === PERMISSOES_CONFIGURACOES.principal.key) {
          PERMISSOES_CONFIGURACOES.sub.forEach(sub => {
            const i = permissaoRemovida.indexOf(sub.key);
            if (i > -1) permissaoRemovida.splice(i, 1);
          });
        }
        return { ...prev, permissoes: permissaoRemovida };
      } else {
        novasPermissoes.push(key);
        if (!novasPermissoes.includes('dashboard')) {
          novasPermissoes.push('dashboard');
        }
        if (key === PERMISSOES_FINANCEIRO.principal.key) {
          PERMISSOES_FINANCEIRO.sub.forEach(sub => {
            if (!novasPermissoes.includes(sub.key)) novasPermissoes.push(sub.key);
          });
        }
        if (key === PERMISSOES_CONTATOS.principal.key) {
          PERMISSOES_CONTATOS.sub.forEach(sub => {
            if (!novasPermissoes.includes(sub.key)) novasPermissoes.push(sub.key);
          });
        }
        if (key === PERMISSOES_PRODUTOS.principal.key) {
          PERMISSOES_PRODUTOS.sub.forEach(sub => {
            if (!novasPermissoes.includes(sub.key)) novasPermissoes.push(sub.key);
          });
        }
        if (key === PERMISSOES_CONFIGURACOES.principal.key) {
          PERMISSOES_CONFIGURACOES.sub.forEach(sub => {
            if (!novasPermissoes.includes(sub.key)) novasPermissoes.push(sub.key);
          });
        }
        return { ...prev, permissoes: novasPermissoes };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações finais
    if (!emailValido) {
      addToast('error', 'E-mail inválido');
      return;
    }
    
    if (form.cpf && form.cpf.trim() && !cpfValido) {
      addToast('error', 'CPF inválido');
      return;
    }
    
    if (!usuarioValido) {
      addToast('error', 'Nome de usuário já existe');
      return;
    }

    // Validações de unicidade só quando o valor mudou (evita "já cadastrado" ao manter o mesmo email/usuário/CPF)
    const emailMudou = usuarioOriginal && form.email?.trim().toLowerCase() !== usuarioOriginal.email?.trim().toLowerCase();
    const usuarioMudou = usuarioOriginal && form.usuario?.trim().toLowerCase() !== (usuarioOriginal as { usuario?: string }).usuario?.trim().toLowerCase();
    const cpfMudou = usuarioOriginal && form.cpf?.trim() !== (usuarioOriginal.cpf ?? '');

    if (emailMudou) {
      const emailUnico = await validarEmailUnico(form.email);
      if (!emailUnico) {
        addToast('error', 'E-mail já cadastrado');
        return;
      }
    }
    if (usuarioMudou) {
      const usuarioUnico = await validarUsuarioUnico(form.usuario);
      if (!usuarioUnico) {
        addToast('error', 'Nome de usuário já existe');
        return;
      }
    }
    if (cpfMudou && form.cpf?.trim()) {
      const cpfUnico = await validarCPFUnico(form.cpf);
      if (!cpfUnico) {
        addToast('error', 'CPF já cadastrado');
        return;
      }
    }

    setSaving(true);
    
    try {
    const updateData: any = {
      id: userId,
      nome: form.nome,
      email: form.email,
      usuario: form.usuario.trim().toLowerCase(),
        cpf: form.cpf?.trim() || null, // ⭐ Envia null se CPF estiver vazio
      whatsapp: form.whatsapp,
      nivel: form.nivel,
      permissoes: form.permissoes,
      auth_user_id: form.auth_user_id,
    };
      
    if (form.senha) {
      updateData.senha = form.senha;
    }

    // Chama a API de edição
    const response = await fetch('/api/usuarios/editar', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(updateData),
    });
      
    const result = await response.json();
      
    if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar alterações');
      }
      
      addToast('success', 'Usuário atualizado com sucesso!');
      router.push('/configuracoes/usuarios');
      
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      addToast('error', error instanceof Error ? error.message : 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    const confirmar = await confirm({
      title: 'Cancelar Edição',
      message: 'Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.',
      confirmText: 'Sim, Cancelar',
      cancelText: 'Continuar Editando'
    });

    if (confirmar) {
      router.push('/configuracoes/usuarios');
    }
  };

  if (!podeAcessar) {
    return (
      <MenuLayout>
        <div className="p-8">
          <AcessoNegadoComponent />
        </div>
      </MenuLayout>
    );
  }

  if (loading) {
    return (
      <MenuLayout>
        <main className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados do usuário...</p>
            </div>
          </div>
        </main>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <main className="p-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/configuracoes/usuarios')}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-900 rounded-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-semibold text-gray-900">
                      Editar Usuário
                    </CardTitle>
                    <p className="text-gray-600 text-sm mt-1">
                      Atualize as informações e permissões do usuário
                    </p>
                  </div>
                </div>
              </div>
        </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Informações Básicas */}
              <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <FiUser className="w-5 h-5" />
                  Informações Básicas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nome Completo *
                    </label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
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
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          usuarioValido 
                            ? 'border-gray-300 focus:ring-gray-900' 
                            : 'border-red-500 focus:ring-red-500'
                        }`}
                        placeholder="Digite o nome de usuário"
                required
              />
                      {form.usuario && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {usuarioValido ? (
                            <FiCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <FiX className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {form.usuario && !usuarioValido && (
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
                name="email"
                value={form.email}
                onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          emailValido 
                            ? 'border-gray-300 focus:ring-gray-900' 
                            : 'border-red-500 focus:ring-red-500'
                        }`}
                        placeholder="Digite o e-mail"
                required
              />
                      {form.email && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {emailValido ? (
                            <FiCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <FiX className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {form.email && !emailValido && (
                      <p className="text-red-500 text-xs">E-mail inválido</p>
                    )}
            </div>

                  {/* Senha */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nova Senha
                    </label>
                    <div className="relative">
              <input
                        type={senhaVisivel ? 'text' : 'password'}
                name="senha"
                value={form.senha}
                onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 pr-12"
                        placeholder="Deixe em branco para não alterar"
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
                    <p className="text-xs text-gray-500">Deixe em branco para manter a senha atual</p>
            </div>

                  {/* CPF */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      CPF
                    </label>
                    <div className="relative">
              <input
                type="text"
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          cpfValido 
                            ? 'border-gray-300 focus:ring-gray-900' 
                            : 'border-red-500 focus:ring-red-500'
                        }`}
                        placeholder="000.000.000-00 (opcional)"
                      />
                      {form.cpf && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {cpfValido ? (
                            <FiCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <FiX className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {form.cpf && !cpfValido && (
                      <p className="text-red-500 text-xs">
                        {form.cpf && validarCPF(form.cpf) ? 'CPF já cadastrado' : 'CPF inválido'}
                      </p>
                    )}
            </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      WhatsApp
                    </label>
              <input
                type="text"
                name="whatsapp"
                value={form.whatsapp}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setForm({ ...form, whatsapp: masker(raw, ['(99) 99999-9999']) });
                }}
                maxLength={15}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                      placeholder="(00) 00000-0000"
              />
            </div>

                  {/* Nível */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nível de Acesso *
                    </label>
              <select
                name="nivel"
                value={form.nivel}
                onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                required
              >
                      <option value="">Selecione o nível...</option>
                <option value="admin">Administrador</option>
                <option value="tecnico">Técnico</option>
                <option value="atendente">Atendente</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>
                </div>
              </div>

              {/* Permissões de Acesso */}
              <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permissões de Acesso
                </h3>
                
                <div className="space-y-6">
                  {/* Módulos Principais (inclui Comissões) */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Principais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {PERMISSOES_PRINCIPAIS.map((permissao) => {
                        const isChecked = form.permissoes.includes(permissao.key);
                        const isDashboard = permissao.key === 'dashboard';
                        return (
                          <label
                            key={permissao.key}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                              isDashboard ? 'border-green-600 bg-green-50 cursor-not-allowed' : isChecked ? 'border-gray-900 bg-gray-50 cursor-pointer' : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDashboard}
                              onChange={() => handlePermissaoChange(permissao.key)}
                              className="w-4 h-4 rounded focus:ring-gray-900 text-gray-900 border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900">{permissao.label}</span>
                              {isDashboard && <span className="text-xs text-green-600 font-medium ml-1">(obrigatório)</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Módulo Financeiro (com Lucro e Desempenho) */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Financeiro</h4>
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.permissoes.includes('financeiro') ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <input type="checkbox" checked={form.permissoes.includes('financeiro')} onChange={() => handlePermissaoChange('financeiro')} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
                        <span className="font-medium text-gray-900">{PERMISSOES_FINANCEIRO.principal.label}</span>
                      </label>
                      {form.permissoes.includes('financeiro') && (
                        <div className="ml-6 space-y-1.5 border-l-2 border-blue-200 pl-3">
                          {PERMISSOES_FINANCEIRO.sub.map((sub) => (
                            <label key={sub.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                              <input type="checkbox" checked={form.permissoes.includes(sub.key)} onChange={() => handlePermissaoChange(sub.key)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                              <span className="text-sm text-gray-700">{sub.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Módulo Contatos */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Contatos</h4>
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.permissoes.includes('clientes') ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <input type="checkbox" checked={form.permissoes.includes('clientes')} onChange={() => handlePermissaoChange('clientes')} className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600" />
                        <span className="font-medium text-gray-900">{PERMISSOES_CONTATOS.principal.label}</span>
                      </label>
                      {form.permissoes.includes('clientes') && (
                        <div className="ml-6 space-y-1.5 border-l-2 border-green-200 pl-3">
                          {PERMISSOES_CONTATOS.sub.map((sub) => (
                            <label key={sub.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                              <input type="checkbox" checked={form.permissoes.includes(sub.key)} onChange={() => handlePermissaoChange(sub.key)} className="w-3.5 h-3.5 rounded border-gray-300 text-green-600" />
                              <span className="text-sm text-gray-700">{sub.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Módulo Produtos/Serviços (Catálogo como sub) */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Produtos e serviços</h4>
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.permissoes.includes('equipamentos') ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <input type="checkbox" checked={form.permissoes.includes('equipamentos')} onChange={() => handlePermissaoChange('equipamentos')} className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600" />
                        <span className="font-medium text-gray-900">{PERMISSOES_PRODUTOS.principal.label}</span>
                      </label>
                      {form.permissoes.includes('equipamentos') && (
                        <div className="ml-6 space-y-1.5 border-l-2 border-purple-200 pl-3">
                          {PERMISSOES_PRODUTOS.sub.map((sub) => (
                            <label key={sub.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                              <input type="checkbox" checked={form.permissoes.includes(sub.key)} onChange={() => handlePermissaoChange(sub.key)} className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600" />
                              <span className="text-sm text-gray-700">{sub.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configurações (subáreas: usuários, empresa, checklist, etc.) */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Configurações</h4>
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.permissoes.includes('configuracoes') ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <input type="checkbox" checked={form.permissoes.includes('configuracoes')} onChange={() => handlePermissaoChange('configuracoes')} className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-600" />
                        <span className="font-medium text-gray-900">{PERMISSOES_CONFIGURACOES.principal.label}</span>
                      </label>
                      {form.permissoes.includes('configuracoes') && (
                        <div className="ml-6 space-y-1.5 border-l-2 border-amber-200 pl-3">
                          {PERMISSOES_CONFIGURACOES.sub.map((sub) => (
                            <label key={sub.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                              <input type="checkbox" checked={form.permissoes.includes(sub.key)} onChange={() => handlePermissaoChange(sub.key)} className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600" />
                              <span className="text-sm text-gray-700">{sub.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Módulos Avançados */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Avançados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PERMISSOES_AVANCADAS.map((permissao) => {
                        const isChecked = form.permissoes.includes(permissao.key);
                        return (
                          <label key={permissao.key} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${isChecked ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => handlePermissaoChange(permissao.key)} className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900" />
                            <span className="font-medium text-gray-900">{permissao.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Como funciona</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Ao marcar um módulo principal (ex.: Financeiro), as sub-opções são incluídas automaticamente; você pode desmarcar alguma depois. Usuários com nível <strong>técnico</strong> só acessam as rotas cujas permissões estiverem marcadas aqui.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
              >
                Cancelar
                </button>
                <button
                type="submit"
                  disabled={saving || !emailValido || !usuarioValido}
                  className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
            </div>
          </form>
          </CardContent>
        </Card>
      </main>
    </MenuLayout>
  );
}

export default function EditarUsuarioPage() {
  return <EditarUsuarioPageInner />;
} 