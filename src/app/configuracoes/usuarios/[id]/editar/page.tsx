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
  FiSave,
  FiX,
  FiCheck
} from 'react-icons/fi';
import { mask as masker } from 'remask';
import { User, Eye, EyeOff } from 'lucide-react';
import PermissionsEditor from '@/components/permissions/PermissionsEditor';
import { getDefaultPermissionsForRole } from '@/lib/permissions';

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
  const [cpfValido, setCpfValido] = useState(true);
  const [erroUsuario, setErroUsuario] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  
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
    return emailRegex.test(email.trim());
  };

  const validarUsuarioUnico = async (usuario: string) => {
    const usuarioNormalizado = usuario.trim().toLowerCase();
    if (!usuarioNormalizado) return false;

    try {
      const res = await fetch('/api/verificar/usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          usuario: usuarioNormalizado,
          excludeId: userId,
        }),
      });
      const result = await res.json();
      if (!res.ok) return true;
      if (typeof result.exists === 'boolean') return !result.exists;
      return true;
    } catch {
      return true;
    }
  };

  const validarEmailUnico = async (email: string) => {
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado) return false;

    try {
      const res = await fetch('/api/verificar/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: emailNormalizado,
          excludeId: userId,
        }),
      });
      const result = await res.json();
      if (!res.ok) return true;
      if (typeof result.exists === 'boolean') return !result.exists;
      return true;
    } catch {
      return true;
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
    if (name === 'usuario') {
      setErroUsuario('');
      setForm((prev) => ({ ...prev, usuario: value.trim().toLowerCase() }));
      return;
    }
    if (name === 'email') {
      setErroEmail('');
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Preencher permissões padrão ao trocar nível
    if (name === 'nivel') {
      const permissoesPadrao = getDefaultPermissionsForRole(value);
      setForm((prev) => ({ ...prev, permissoes: permissoesPadrao }));
    }
  };

  // Permissões gerenciadas pelo PermissionsEditor

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroUsuario('');
    setErroEmail('');
    
    // Validações finais
    if (!validarEmail(form.email)) {
      setErroEmail('E-mail inválido');
      addToast('error', 'E-mail inválido');
      return;
    }
    
    if (form.cpf && form.cpf.trim() && !cpfValido) {
      addToast('error', 'CPF inválido');
      return;
    }
    
    // Validações de unicidade só quando o valor mudou (evita "já cadastrado" ao manter o mesmo email/usuário/CPF)
    const emailMudou = usuarioOriginal && form.email?.trim().toLowerCase() !== usuarioOriginal.email?.trim().toLowerCase();
    const usuarioMudou = usuarioOriginal && form.usuario?.trim().toLowerCase() !== (usuarioOriginal as { usuario?: string }).usuario?.trim().toLowerCase();
    const cpfMudou = usuarioOriginal && form.cpf?.trim() !== (usuarioOriginal.cpf ?? '');

    if (emailMudou) {
      const emailUnico = await validarEmailUnico(form.email);
      if (!emailUnico) {
        setErroEmail('E-mail já cadastrado');
        addToast('error', 'E-mail já cadastrado');
        return;
      }
    }
    if (usuarioMudou) {
      const usuarioUnico = await validarUsuarioUnico(form.usuario);
      if (!usuarioUnico) {
        setErroUsuario('Nome de usuário já cadastrado');
        addToast('error', 'Nome de usuário já cadastrado');
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
      email: form.email.trim().toLowerCase(),
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
      const msg = error instanceof Error ? error.message : 'Erro ao salvar alterações';
      if (/usu[aá]rio/i.test(msg)) {
        setErroUsuario(msg);
      }
      if (/e-?mail/i.test(msg)) {
        setErroEmail(msg);
      }
      addToast('error', msg);
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
                    <input
                type="text"
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          erroUsuario
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-gray-900'
                        }`}
                        placeholder="Digite o nome de usuário"
                required
              />
                    {erroUsuario && (
                      <p className="text-red-500 text-xs">{erroUsuario}</p>
                    )}
            </div>

                  {/* E-mail */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      E-mail *
                    </label>
                    <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          erroEmail
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-gray-900'
                        }`}
                        placeholder="Digite o e-mail"
                required
              />
                    {erroEmail && (
                      <p className="text-red-500 text-xs">{erroEmail}</p>
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
                <PermissionsEditor
                  permissoes={form.permissoes}
                  onChange={(permissoes) => setForm((prev) => ({ ...prev, permissoes }))}
                  onDashboardLocked={() =>
                    addToast('warning', 'Dashboard é uma permissão obrigatória e não pode ser removida')
                  }
                />
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
                  disabled={saving || !form.email.trim() || !form.usuario.trim()}
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