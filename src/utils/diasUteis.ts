/** Prazo padrão de entrega ao criar O.S. sem data informada (dias úteis, seg–sex). */
export const PRAZO_ENTREGA_DIAS_UTEIS_PADRAO = 3;

function isDiaUtil(date: Date): boolean {
  const dia = date.getDay();
  return dia !== 0 && dia !== 6;
}

/** Soma N dias úteis a partir da data base (não conta o dia base). */
export function addDiasUteis(dataBase: Date, quantidade: number): Date {
  const resultado = new Date(dataBase);
  let adicionados = 0;

  while (adicionados < quantidade) {
    resultado.setDate(resultado.getDate() + 1);
    if (isDiaUtil(resultado)) {
      adicionados += 1;
    }
  }

  return resultado;
}

export function calcularPrazoEntregaPadrao(
  dataBase: Date = new Date(),
  diasUteis: number = PRAZO_ENTREGA_DIAS_UTEIS_PADRAO
): Date {
  const prazo = addDiasUteis(dataBase, diasUteis);
  prazo.setHours(dataBase.getHours(), dataBase.getMinutes(), 0, 0);
  return prazo;
}

export function formatarDataHoraPtBr(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
