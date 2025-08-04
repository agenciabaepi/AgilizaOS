const mercadopago = require('mercadopago');

// Configuração do Mercado Pago
const configureMercadoPago = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const environment = process.env.MERCADOPAGO_ENVIRONMENT || 'production';
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  mercadopago.configure({
    access_token: accessToken,
    environment: environment as 'sandbox' | 'production'
  });

  console.log(`Mercado Pago configurado para ambiente: ${environment}`);
  return mercadopago;
};

export { configureMercadoPago };
export default mercadopago; 