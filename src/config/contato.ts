export const CONTATO = {
  whatsapp: '5512988353971',
  whatsappDisplay: '(12) 98835-3971',
  email: 'suporte@gestaoconsert.com.br',
  endereco: 'Av. Princesa Isabel, 1417 — Loja 4',
  cidade: 'Ilhabela, SP',
  marca: 'Gestão Consert',
} as const;

export const MENSAGEM_WHATSAPP_PADRAO =
  'Olá! Gostaria de saber mais sobre o Gestão Consert para minha assistência técnica.';

export function getWhatsAppUrl(mensagem = MENSAGEM_WHATSAPP_PADRAO) {
  return `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirWhatsApp(mensagem?: string) {
  window.open(getWhatsAppUrl(mensagem), '_blank', 'noopener,noreferrer');
}
