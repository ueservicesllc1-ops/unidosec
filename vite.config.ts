import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import { sendGmailSmtp, buildCampaignApprovedEmail, loadEnvFile } from './emailSender.js'

function emailApiPlugin() {
  return {
    name: 'unidos-email-api-plugin',
    configureServer(server: any) {
      loadEnvFile();

      const readJsonBody = (req: any): Promise<any> =>
        new Promise((resolve, reject) => {
          let raw = '';
          req.on('data', (chunk: any) => {
            raw += chunk;
          });
          req.on('end', () => {
            try {
              resolve(raw ? JSON.parse(raw) : {});
            } catch (e) {
              reject(e);
            }
          });
          req.on('error', reject);
        });

      const sendJson = (res: any, status: number, payload: any) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
      };

      server.middlewares.use('/api/send-approval-email', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next();
        try {
          const body = await readJsonBody(req);
          const {
            to,
            campaignId,
            campaignTitle,
            organizerName,
            category,
            goal,
            imageUrl,
            baseUrl,
            gmailUser,
            gmailAppPassword,
            senderName,
          } = body || {};

          if (!to || !campaignId || !campaignTitle) {
            return sendJson(res, 400, {
              ok: false,
              error: 'Faltan datos obligatorios (to, campaignId, campaignTitle).',
            });
          }

          const emailData = buildCampaignApprovedEmail({
            campaignId,
            campaignTitle,
            organizerName,
            category,
            goal,
            imageUrl,
            baseUrl: baseUrl || 'https://unidosecuador.org',
          });

          const result = await sendGmailSmtp({
            gmailUser,
            gmailAppPassword,
            to,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
            fromName: senderName || 'Unidos EC | EcuFund',
          });

          return sendJson(res, 200, {
            ok: true,
            to: result.to,
            from: result.from,
            shareLinks: emailData.shareLinks,
          });
        } catch (err: any) {
          console.error('Error sending approval email (Vite middleware):', err);
          return sendJson(res, 500, {
            ok: false,
            code: err?.code || 'EMAIL_ERROR',
            error: err?.message || 'No se pudo enviar el correo.',
          });
        }
      });

      server.middlewares.use('/api/test-email', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next();
        try {
          const body = await readJsonBody(req);
          const { to, gmailUser, gmailAppPassword, senderName } = body || {};
          const targetEmail = to || gmailUser || process.env.GMAIL_USER;

          const emailData = buildCampaignApprovedEmail({
            campaignId: 'ejemplo-123',
            campaignTitle: 'Campaña de Prueba en Unidos EC',
            organizerName: 'Administrador Unidos EC',
            category: 'Salud',
            goal: 5000,
            baseUrl: 'https://unidosecuador.org',
          });

          const result = await sendGmailSmtp({
            gmailUser,
            gmailAppPassword,
            to: targetEmail,
            subject: '✅ Prueba de Configuración de Correo - Unidos EC',
            text: emailData.text,
            html: emailData.html,
            fromName: senderName || 'Unidos EC | EcuFund',
          });

          return sendJson(res, 200, { ok: true, to: result.to, from: result.from });
        } catch (err: any) {
          console.error('Error sending test email (Vite middleware):', err);
          return sendJson(res, 500, {
            ok: false,
            code: err?.code || 'EMAIL_ERROR',
            error: err?.message || 'Error al probar el envío de correo.',
          });
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emailApiPlugin()],
})
