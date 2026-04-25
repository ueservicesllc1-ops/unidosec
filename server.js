import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
      html = html.replace(/<title>.*<\/title>/, `<title>${title} | EcuFund</title>`);
      html = html.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title} | EcuFund" />`);
      html = html.replace(/<meta property="og:description" content="[^"]*"[\s]*\/>/, `<meta property="og:description" content="${description}" />`);
      html = html.replace(/<meta property="og:image" content="[^"]*"[\s]*\/>/, `<meta property="og:image" content="${imageUrl}" />`);
      
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
