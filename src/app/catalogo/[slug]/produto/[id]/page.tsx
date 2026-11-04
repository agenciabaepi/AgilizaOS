import { CatalogoProdutoDetalhe } from '@/components/catalogo-publico/CatalogoProdutoDetalhe';

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug, id } = await params;
  return {
    title: `Produto | ${slug}`,
    description: 'Detalhes do produto no catálogo. Peça direto pelo WhatsApp.',
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/catalogo/${slug}/produto/${id}`,
    },
  };
}

export default async function CatalogoProdutoPage({ params }: PageProps) {
  const { slug, id } = await params;
  return <CatalogoProdutoDetalhe slug={slug} produtoId={id} />;
}
