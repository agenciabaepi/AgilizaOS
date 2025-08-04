import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configuração do Mercado Pago
const configureMercadoPago = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const environment = process.env.MERCADOPAGO_ENVIRONMENT || 'sandbox';
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  console.log(`Configurando Mercado Pago com token: ${accessToken.substring(0, 10)}...`);
  console.log(`Ambiente: ${environment}`);

  const config = new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
      timeout: 10000, // Aumentar timeout
    }
  });

  console.log(`Mercado Pago configurado para ambiente: ${environment}`);
  return { config, Preference };
};

export { configureMercadoPago }; 