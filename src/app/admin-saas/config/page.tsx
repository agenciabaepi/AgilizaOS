export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

/** Legado: redireciona para gestão de planos. */
export default function ConfigPage() {
  redirect('/admin-saas/planos');
}
