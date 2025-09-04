// Utilitário de logging seguro para produção
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  // Apenas logs de erro são permitidos em produção
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  // Warnings apenas em desenvolvimento
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  // Logs normais apenas em desenvolvimento
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  // Info apenas em desenvolvimento
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  // Debug apenas em desenvolvimento
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Função para suprimir todos os logs em produção
export const suppressLogsInProduction = () => {
  if (process.env.NODE_ENV === 'production') {
    // Sobrescrever console.log, console.info, console.debug em produção
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.trace = () => {};
    
    // Manter apenas console.error e console.warn para erros críticos
    // console.error e console.warn são mantidos para debugging de produção
  }
};
