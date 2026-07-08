// lib/email/resend.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY não configurado');

export const resend = new Resend(process.env.RESEND_API_KEY);
export const EMAIL_FROM = process.env.EMAIL_FROM || 'SACODE <nao-responda@cantorcaiolacerda.com.br>';
