import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendGmailSmtp, buildCampaignApprovedEmail, loadEnvFile } from './emailSender.js';

loadEnvFile();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// Endpoint para enviar correo de aprobación de campaña con links de redes sociales
app.post('/api/send-approval-email', async (req, res) => {
  try {
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
      senderName
    } = req.body || {};

    if (!to || !campaignId || !campaignTitle) {
      return res.status(400).json({
        ok: false,
        error: 'Faltan datos obligatorios (to, campaignId, campaignTitle).'
      });
    }

    const emailData = buildCampaignApprovedEmail({
      campaignId,
      campaignTitle,
      organizerName,
      category,
      goal,
      imageUrl,
      baseUrl: baseUrl || `${req.protocol}://${req.get('host')}`
    });

    const result = await sendGmailSmtp({
      gmailUser,
      gmailAppPassword,
      to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      fromName: senderName || 'Unidos EC | EcuFund'
    });

    return res.json({
      ok: true,
      to: result.to,
      from: result.from,
      shareLinks: emailData.shareLinks
    });
  } catch (error) {
    console.error('Error sending approval email:', error);
    return res.status(500).json({
      ok: false,
      code: error.code || 'EMAIL_ERROR',
      error: error.message || 'No se pudo enviar el correo.'
    });
  }
});

// Endpoint para enviar correo de prueba desde el panel de Administración
app.post('/api/test-email', async (req, res) => {
  try {
    const { to, gmailUser, gmailAppPassword, senderName } = req.body || {};
    const targetEmail = to || gmailUser || process.env.GMAIL_USER;

    const emailData = buildCampaignApprovedEmail({
      campaignId: 'ejemplo-123',
      campaignTitle: 'Campaña de Prueba en Unidos EC',
      organizerName: 'Administrador Unidos EC',
      category: 'Salud',
      goal: 5000,
      baseUrl: 'https://unidosecuador.org'
    });

    const result = await sendGmailSmtp({
      gmailUser,
      gmailAppPassword,
      to: targetEmail,
      subject: '✅ Prueba de Configuración de Correo - Unidos EC',
      text: emailData.text,
      html: emailData.html,
      fromName: senderName || 'Unidos EC | EcuFund'
    });

    return res.json({ ok: true, to: result.to, from: result.from });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      ok: false,
      code: error.code || 'EMAIL_ERROR',
      error: error.message || 'Error al probar el envío de correo.'
    });
  }
});

// Lista de User-Agents de bots de redes sociales
const isBot = (userAgent) => {
  if (!userAgent) return false;
  const bots = [
    'facebookexternalhit',
    'twitterbot',
    'whatsapp',
    'linkedinbot',
    'telegrambot',
    'skypeuripreview',
    'slackbot'
  ];
  return bots.some(bot => userAgent.toLowerCase().includes(bot));
};

// Ruta principal para servir los archivos estáticos de React
const indexPath = path.resolve(__dirname, 'dist', 'index.html');

// Interceptar específicamente las rutas de las campañas
app.get('/campaign/:id', async (req, res, next) => {
  const userAgent = req.headers['user-agent'];
  
  if (isBot(userAgent)) {
    try {
      const campaignId = req.params.id;
      // Consultar directamente a la API REST de Firestore
      // El proyecto de Firebase en firebase.ts es 'unidosec'
      const response = await fetch(`https://firestore.googleapis.com/v1/projects/unidosec/databases/(default)/documents/campaigns/${campaignId}`);
      
      if (!response.ok) {
        throw new Error('Campaign not found');
      }
      
      const data = await response.json();
      const fields = data.fields;
      
      const title = fields?.title?.stringValue || 'EcuFund | Apoya causas en Ecuador';
      const description = fields?.description?.stringValue?.substring(0, 160) || 'EcuFund es la plataforma de crowdfunding más confiable de Ecuador.';
      const imageUrl = fields?.imageUrl?.stringValue || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&h=630&q=80';
      
      // Leer el HTML generado por Vite
      let html = fs.readFileSync(indexPath, 'utf8');
      
      // Reemplazar las etiquetas estáticas por las dinámicas de la campaña
      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title} | EcuFund</title>`);
      html = html.replace(/<meta[^>]*property="og:url"[^>]*>/i, `<meta property="og:url" content="https://unidosecuador.org/campaign/${campaignId}" />`);
      html = html.replace(/<meta[^>]*property="og:title"[^>]*>/i, `<meta property="og:title" content="${title} | EcuFund" />`);
      html = html.replace(/<meta[^>]*property="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`);
      html = html.replace(/<meta[^>]*property="og:image"[^>]*>/i, `<meta property="og:image" content="${imageUrl}" />`);
      
      // Añadir secure_url si es necesario
      html = html.replace('</head>', `<meta property="og:image:secure_url" content="${imageUrl}" />\n</head>`);
      
      return res.send(html);
    } catch (error) {
      console.error('Error fetching campaign for bot:', error);
      // Si falla, enviamos el HTML normal
      return res.sendFile(indexPath);
    }
  }
  
  // Si no es un bot, continuar normalmente para servir el archivo estático
  next();
});

// Servir los archivos estáticos desde la carpeta 'dist'
app.use(express.static(path.resolve(__dirname, 'dist')));

// Redirigir cualquier otra ruta no encontrada a 'index.html' para que React Router se encargue
app.use((req, res) => {
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
