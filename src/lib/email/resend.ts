// lib/email/resend.ts
import { Resend } from 'resend';
import { platform } from '@/lib/config';

if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY não configurado');

export const resend = new Resend(process.env.RESEND_API_KEY);
export const EMAIL_FROM = platform.emailFrom;
