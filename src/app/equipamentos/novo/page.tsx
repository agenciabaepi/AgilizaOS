'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { Input } from '@/components/Input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';

export default function NovoProdutoPage() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    nome: 'Produto Teste',
    tipo: 'produto',
    codigo: '',
    grupo: 'Acessórios',
    categoria: 'Carregadores',
    subcategoria: 'Turbo',
    custo: '10',
    preco: '25',
    unidade: 'Unidade',
    fornecedor: 'TechDistribuidora',
    marca: 'Samsung',
    estoque_min: '5',
    estoque_max: '50',
    estoque_atual: '20',
    situacao: 'Ativo',
    ncm: '8471.80.10',
    cfop: '5102',
    cst: '00',
    cest: '28.038.00',
    largura_cm: '10',
    altura_cm: '15',
    profundidade_cm: '5',
    peso_g: '250',
    obs: 'Produto de teste gerado automaticamente.',
    ativo: 'true',
    codigo_barras: '7894561230001',
  });

  const handleSubmit = async () => {
    // Gerar código sequencial por empresa
    const empresa_id = localStorage.getItem('empresa_id');
    if (!empresa_id) {
      alert('Erro: empresa_id não encontrado. Faça login novamente.');
      return;
    }

    const res = await fetch(`/api/produtos?empresa_id=${empresa_id}`);
    const json = await res.json();
    const ultimoCodigo = Number(json?.ultimoCodigo) || 0;
    const proximoCodigo = ultimoCodigo + 1;
    formData.codigo = proximoCodigo.toString();

    // Checagem dos campos obrigatórios
    if (
      !formData.grupo ||
      !formData.unidade ||
      !formData.fornecedor
    ) {
      alert('Por favor, preencha todos os campos obrigatórios: Grupo, Unidade, Fornecedor.');
      return;
    }

    // Coleta das imagens selecionadas
    const imagens = selectedImages ? Array.from(selectedImages) : [];

    // Log dos dados enviados
    console.log('Dados enviados:', formData);

    // empresa_id já obtido acima

    const data = {
      nome: formData.nome,
      tipo: formData.tipo,
      codigo: formData.codigo,
      grupo: formData.grupo,
      categoria: formData.categoria,
      subcategoria: formData.subcategoria,
      custo: parseFloat(formData.custo || '0'),
      preco: parseFloat(formData.preco || '0'),
      unidade: formData.unidade,
      fornecedor: formData.fornecedor,
      marca: formData.marca,
      estoque_min: parseFloat(formData.estoque_min || '0'),
      estoque_max: parseFloat(formData.estoque_max || '0'),
      estoque_atual: parseFloat(formData.estoque_atual || '0'),
      situacao: formData.situacao,
      ncm: formData.ncm,
      cfop: formData.cfop,
      cst: formData.cst,
      cest: formData.cest,
      largura_cm: parseFloat(formData.largura_cm || '0'),
      altura_cm: parseFloat(formData.altura_cm || '0'),
      profundidade_cm: parseFloat(formData.profundidade_cm || '0'),
      peso_g: parseFloat(formData.peso_g || '0'),
      obs: formData.obs,
      empresa_id,
      ativo: true,
      codigo_barras: formData.codigo_barras,
      imagens,
    };

    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro detalhado:', errorData);
        throw new Error(errorData.message || 'Erro ao salvar produto');
      }

      alert('Produto cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar produto');
    }
  };

  return (
    <MenuLayout>
      <main className="flex flex-col items-center justify-start flex-1 px-4 py-8">
        <div className="w-full max-w-5xl">
          <h1 className="text-2xl font-bold mb-6">Novo Produto</h1>

          <Tab.Group manual defaultIndex={0}>
            <Tab.List className="flex space-x-2 border-b mb-4">
              {['dados', 'fiscal', 'imagens', 'detalhes', 'outros'].map((tabName) => (
                <Tab
                  key={tabName}
                  className={({ selected }) =>
                    `px-4 py-2 text-sm font-medium rounded-t ${
                      selected ? 'bg-black text-white' : 'bg-muted text-black'
                    }`
                  }
                >
                  {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
                </Tab>
              ))}
            </Tab.List>

            <Tab.Panels>
              <Tab.Panel>
                {/* Conteúdo da aba Dados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome do Produto</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Carregador Turbo"
                    />
                  </div>
                  <div>
                    <Select
                      id="tipo"
                      label="Tipo"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      <option value="produto">Produto</option>
                      <option value="servico">Serviço</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="codigo_barras">Código de barras</Label>
                    <Input
                      id="codigo_barras"
                      value={formData.codigo_barras}
                      onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                      placeholder="Ex: 7894561230001"
                    />
                    <Button
                      type="button"
                      className="mt-2"
                      onClick={() => {
                        const codigoAleatorio = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
                        setFormData({ ...formData, codigo_barras: codigoAleatorio });
                      }}
                    >
                      Gerar Código
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="grupo">Grupo</Label>
                    <Input
                      id="grupo"
                      value={formData.grupo}
                      onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                      placeholder="Ex: Acessórios"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder="Ex: Carregadores"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subcategoria">Subcategoria</Label>
                    <Input
                      id="subcategoria"
                      value={formData.subcategoria}
                      onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                      placeholder="Ex: Turbo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custo">Preço de Custo</Label>
                    <Input
                      id="custo"
                      type="number"
                      value={formData.custo}
                      onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preco">Preço de Venda</Label>
                    <Input
                      id="preco"
                      type="number"
                      value={formData.preco}
                      onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <Select
                      id="unidade"
                      label="Unidade de Medida"
                      value={formData.unidade}
                      onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      <option value="Unidade">Unidade</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Lote">Lote</option>
                      <option value="Pacote">Pacote</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <Input
                      id="fornecedor"
                      value={formData.fornecedor}
                      onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                      placeholder="Ex: TechDistribuidora"
                    />
                  </div>
                  <div>
                    <Label htmlFor="marca">Marca</Label>
                    <Input
                      id="marca"
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      placeholder="Ex: Samsung"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estoqueMin">Estoque Mínimo</Label>
                    <Input
                      id="estoqueMin"
                      type="number"
                      value={formData.estoque_min}
                      onChange={(e) => setFormData({ ...formData, estoque_min: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estoqueMax">Estoque Máximo</Label>
                    <Input
                      id="estoqueMax"
                      type="number"
                      value={formData.estoque_max}
                      onChange={(e) => setFormData({ ...formData, estoque_max: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estoqueAtual">Estoque Atual</Label>
                    <Input
                      id="estoqueAtual"
                      type="number"
                      value={formData.estoque_atual}
                      onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Situação</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={formData.situacao === 'Ativo' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, situacao: 'Ativo' })}
                      >
                        Ativo
                      </Button>
                      <Button
                        type="button"
                        variant={formData.situacao === 'Inativo' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, situacao: 'Inativo' })}
                      >
                        Inativo
                      </Button>
                    </div>
                  </div>
                </div>
              </Tab.Panel>

              <Tab.Panel>
                {/* Conteúdo da aba Fiscal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ncm">NCM</Label>
                    <Input
                      id="ncm"
                      value={formData.ncm}
                      onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                      placeholder="Ex: 8471.80.10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfop">CFOP</Label>
                    <Input
                      id="cfop"
                      value={formData.cfop}
                      onChange={(e) => setFormData({ ...formData, cfop: e.target.value })}
                      placeholder="Ex: 5102"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cst">CST</Label>
                    <Input
                      id="cst"
                      value={formData.cst}
                      onChange={(e) => setFormData({ ...formData, cst: e.target.value })}
                      placeholder="Ex: 00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cest">CEST</Label>
                    <Input
                      id="cest"
                      value={formData.cest}
                      onChange={(e) => setFormData({ ...formData, cest: e.target.value })}
                      placeholder="Ex: 28.038.00"
                    />
                  </div>
                </div>
              </Tab.Panel>

              <Tab.Panel>
                {/* Conteúdo da aba Imagens */}
                <Label htmlFor="imagens">Upload de Imagens</Label>
                <Input
                  id="imagens"
                  type="file"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);

                    const oversized = files.filter((file) => file.size > 3 * 1024 * 1024);
                    if (oversized.length > 0) {
                      alert("Algumas imagens excedem 3MB e foram ignoradas.");
                    }

                    const validFiles = files.filter((file) => file.size <= 3 * 1024 * 1024);
                    const totalImages = selectedImages.length + validFiles.length;

                    if (totalImages > 5) {
                      alert("Você pode enviar no máximo 5 imagens de até 3MB cada.");
                      return;
                    }

                    setSelectedImages((prev) => [...prev, ...validFiles]);
                  }}
                />
                <p className="text-sm text-muted-foreground mt-2">Adicione fotos para facilitar a identificação visual do produto.</p>
                {/* Pré-visualização das imagens */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="border rounded p-2">
                      {file && (
                        <>
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            className="w-full h-auto object-contain"
                          />
                          <p className="text-xs mt-2 break-words">{file.name}</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-2 text-xs"
                            onClick={() =>
                              setSelectedImages((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            Remover
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </Tab.Panel>

              <Tab.Panel>
                {/* Conteúdo da aba Detalhes */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="largura">Largura (cm)</Label>
                      <Input
                        id="largura"
                        type="number"
                        value={formData.largura_cm}
                        onChange={(e) => setFormData({ ...formData, largura_cm: e.target.value })}
                        placeholder="Ex: 10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="altura">Altura (cm)</Label>
                      <Input
                        id="altura"
                        type="number"
                        value={formData.altura_cm}
                        onChange={(e) => setFormData({ ...formData, altura_cm: e.target.value })}
                        placeholder="Ex: 10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="profundidade">Profundidade (cm)</Label>
                      <Input
                        id="profundidade"
                        type="number"
                        value={formData.profundidade_cm}
                        onChange={(e) => setFormData({ ...formData, profundidade_cm: e.target.value })}
                        placeholder="Ex: 5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="peso">Peso (g)</Label>
                    <Input
                      id="peso"
                      type="number"
                      value={formData.peso_g}
                      onChange={(e) => setFormData({ ...formData, peso_g: e.target.value })}
                      placeholder="Ex: 250"
                    />
                  </div>
                </div>
              </Tab.Panel>

              <Tab.Panel>
                {/* Conteúdo da aba Outros */}
                <div>
                  <Label htmlFor="obs">Observações</Label>
                  <Textarea
                    id="obs"
                    value={formData.obs}
                    onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                    placeholder="Observações adicionais sobre o produto..."
                  />
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>

          <div className="mt-6 flex gap-4">
            <Button type="button" onClick={handleSubmit}>Salvar Produto</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.history.back()}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </main>
    </MenuLayout>
  );
}