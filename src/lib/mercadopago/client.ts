// lib/mercadopago/client.ts
import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';

if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado');

export const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 10000 },
});

export const mpPreference = new Preference(mpConfig);
export const mpPayment = new Payment(mpConfig);
export const mpPaymentRefund = new PaymentRefund(mpConfig);
