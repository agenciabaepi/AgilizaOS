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
  const [tab, setTab] = useState('dados');
  const [situacao, setSituacao] = useState<'Ativo' | 'Inativo'>('Ativo');

  return (
    <MenuLayout>
      <main className="flex flex-col items-center justify-start flex-1 px-4 py-8">
        <div className="w-full max-w-5xl">
          <h1 className="text-2xl font-bold mb-6">Novo Produto</h1>

          <Tab.Group>
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
                    <Input id="nome" placeholder="Ex: Carregador Turbo" />
                  </div>
                  <div>
                    <Label htmlFor="tipo">Tipo</Label>
                    <Input id="tipo" placeholder="Produto ou Serviço" />
                  </div>
                  <div>
                    <Label htmlFor="codigo">Código de barras / SKU</Label>
                    <Input id="codigo" placeholder="Ex: 7894561230001" />
                    <Button
                      type="button"
                      className="mt-2"
                      onClick={() => {
                        const codigoAleatorio = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
                        const input = document.getElementById('codigo') as HTMLInputElement;
                        if (input) input.value = codigoAleatorio;
                      }}
                    >
                      Gerar Código
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="grupo">Grupo</Label>
                    <Input id="grupo" placeholder="Ex: Acessórios" />
                  </div>
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input id="categoria" placeholder="Ex: Carregadores" />
                  </div>
                  <div>
                    <Label htmlFor="subcategoria">Subcategoria</Label>
                    <Input id="subcategoria" placeholder="Ex: Turbo" />
                  </div>
                  <div>
                    <Label htmlFor="custo">Preço de Custo</Label>
                    <Input id="custo" type="number" placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <Label htmlFor="preco">Preço de Venda</Label>
                    <Input id="preco" type="number" placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <Select id="unidade" label="Unidade de Medida" defaultValue="">
                      <option value="">Selecione</option>
                      <option value="Unidade">Unidade</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Lote">Lote</option>
                      <option value="Pacote">Pacote</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <Input id="fornecedor" placeholder="Ex: TechDistribuidora" />
                  </div>
                  <div>
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" placeholder="Ex: Samsung" />
                  </div>
                  <div>
                    <Label htmlFor="estoqueMin">Estoque Mínimo</Label>
                    <Input id="estoqueMin" type="number" />
                  </div>
                  <div>
                    <Label htmlFor="estoqueMax">Estoque Máximo</Label>
                    <Input id="estoqueMax" type="number" />
                  </div>
                  <div>
                    <Label htmlFor="estoqueAtual">Estoque Atual</Label>
                    <Input id="estoqueAtual" type="number" />
                  </div>
                  <div>
                    <Label>Situação</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={situacao === 'Ativo' ? 'default' : 'outline'}
                        onClick={() => setSituacao('Ativo')}
                      >
                        Ativo
                      </Button>
                      <Button
                        type="button"
                        variant={situacao === 'Inativo' ? 'default' : 'outline'}
                        onClick={() => setSituacao('Inativo')}
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
                    <Input id="ncm" placeholder="Ex: 8471.80.10" />
                  </div>
                  <div>
                    <Label htmlFor="cfop">CFOP</Label>
                    <Input id="cfop" placeholder="Ex: 5102" />
                  </div>
                  <div>
                    <Label htmlFor="cst">CST</Label>
                    <Input id="cst" placeholder="Ex: 00" />
                  </div>
                  <div>
                    <Label htmlFor="cest">CEST</Label>
                    <Input id="cest" placeholder="Ex: 28.038.00" />
                  </div>
                </div>
              </Tab.Panel>

              <Tab.Panel>
                {/* Conteúdo da aba Imagens */}
                <Label htmlFor="imagens">Upload de Imagens</Label>
                <Input id="imagens" type="file" multiple />
                <p className="text-sm text-muted-foreground mt-2">Adicione fotos para facilitar a identificação visual do produto.</p>
                {/* Pré-visualização futura: espaço reservado */}
                <div className="mt-4 border rounded p-4 text-sm text-muted-foreground">Pré-visualização das imagens aparecerá aqui.</div>
              </Tab.Panel>

              <Tab.Panel>
                {/* Conteúdo da aba Detalhes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dimensoes">Dimensões e Peso</Label>
                    <Input id="dimensoes" placeholder="Ex: 10x10x5cm - 250g" />
                  </div>
                  <div>
                    <Label htmlFor="cor">Cor</Label>
                    <Input id="cor" placeholder="Ex: Preto" />
                  </div>
                </div>
              </Tab.Panel>

              <Tab.Panel>
                {/* Conteúdo da aba Outros */}
                <div>
                  <Label htmlFor="obs">Observações</Label>
                  <Textarea id="obs" placeholder="Observações adicionais sobre o produto..." />
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>

          <div className="mt-6 flex gap-4">
            <Button type="submit">Salvar Produto</Button>
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