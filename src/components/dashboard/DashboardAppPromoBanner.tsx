'use client';

import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_URL } from '@/config/appStore';

const BANNER_SRC = '/assets/imagens/bannerapp.jpg';

export default function DashboardAppPromoBanner() {
  return (
    <Link
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:opacity-[0.98] transition-opacity"
      aria-label="Baixar app Gestão Consert na App Store"
    >
      <Image
        src={BANNER_SRC}
        alt="Gestão Consert no iPhone — baixe o app na App Store. Em breve para Android."
        width={1920}
        height={500}
        className="w-full h-20 sm:h-24 md:h-28 object-contain object-center"
        sizes="(max-width: 768px) 100vw, 1200px"
        priority={false}
      />
    </Link>
  );
}
