import { fiscalFetch } from '@/lib/api/fiscalFetch';

export type FormatoNota = 'cupom' | 'a4';

async function abrirPdfBlob(
  blob: Blob,
  opts?: { autoPrint?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = URL.createObjectURL(blob);

  // Preferência: nova aba. Se o browser bloquear, usa iframe oculto (ainda no gesto do usuário).
  const w = window.open(url, '_blank');
  if (w) {
    if (opts?.autoPrint !== false) {
      w.addEventListener('load', () => {
        try {
          w.focus();
          w.print();
        } catch {
          /* ignore */
        }
      });
      setTimeout(() => {
        try {
          w.print();
        } catch {
          /* ignore */
        }
      }, 800);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { ok: true };
  }

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      setTimeout(() => resolve(), 1200);
    });
    if (opts?.autoPrint !== false) {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        /* ignore */
      }
    }
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
    return { ok: true };
  } catch {
    // Último recurso: download do PDF
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nota-fiscal.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { ok: true };
  }
}

/** Baixa o DANFSe / cupom NFS-e e abre em nova aba. */
export async function abrirDanfsePdf(
  nfseId: string,
  opts?: { autoPrint?: boolean; formato?: FormatoNota }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const formato = opts?.formato || 'cupom';
    const res = await fiscalFetch(`/api/fiscal/nfse/${nfseId}/danfse?formato=${formato}`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: json.error || `Erro HTTP ${res.status}` };
    }
    return abrirPdfBlob(await res.blob(), opts);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao abrir DANFSe' };
  }
}

/** Baixa o DANFE NFC-e (cupom 80mm) e abre em nova aba. */
export async function abrirDanfeNfcePdf(
  nfceId: string,
  opts?: { autoPrint?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fiscalFetch(`/api/fiscal/nfce/${nfceId}/danfe`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: json.error || `Erro HTTP ${res.status}` };
    }
    return abrirPdfBlob(await res.blob(), opts);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao abrir DANFE NFC-e' };
  }
}

/** Baixa o DANFE NF-e padrão A4 (modelo 55) e abre em nova aba. */
export async function abrirDanfeNfePdf(
  nfeId: string,
  opts?: { autoPrint?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fiscalFetch(`/api/fiscal/nfe/${nfeId}/danfe`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: json.error || `Erro HTTP ${res.status}` };
    }
    return abrirPdfBlob(await res.blob(), opts);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao abrir DANFE NF-e' };
  }
}

/** PDF único: NFS-e + NFC-e em páginas separadas. */
export async function abrirNotasConjuntasPdf(
  opts: {
    nfseId?: string | null;
    nfceId?: string | null;
    autoPrint?: boolean;
    formato?: FormatoNota;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const qs = new URLSearchParams();
    if (opts.nfseId) qs.set('nfseId', opts.nfseId);
    if (opts.nfceId) qs.set('nfceId', opts.nfceId);
    qs.set('formato', opts.formato || 'cupom');
    if (!qs.has('nfseId') && !qs.has('nfceId')) {
      return { ok: false, error: 'Nenhuma nota para imprimir.' };
    }
    const res = await fiscalFetch(`/api/fiscal/notas/imprimir-conjunto?${qs.toString()}`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: json.error || `Erro HTTP ${res.status}` };
    }
    return abrirPdfBlob(await res.blob(), { autoPrint: opts.autoPrint });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao abrir notas' };
  }
}
