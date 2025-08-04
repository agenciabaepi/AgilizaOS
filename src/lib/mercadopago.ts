import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configuração do Mercado Pago
const configureMercadoPago = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const environment = process.env.MERCADOPAGO_ENVIRONMENT || 'production';
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  const config = new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
      timeout: 5000,
    }
  });

  console.log(`Mercado Pago configurado para ambiente: ${environment}`);
  return { config, Preference };
};

export { configureMercadoPago }; 