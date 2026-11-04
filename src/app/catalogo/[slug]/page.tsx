import { CatalogoPublicoView } from '@/components/catalogo-publico/CatalogoPublicoView';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `Catálogo | ${slug}`,
    description: 'Catálogo de produtos e serviços. Peça direto pelo WhatsApp.',
    robots: { index: true, follow: true },
  };
}

export default async function CatalogoPublicoPage({ params }: PageProps) {
  const { slug } = await params;
  return <CatalogoPublicoView slug={slug} />;
}
