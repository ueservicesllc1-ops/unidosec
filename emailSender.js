import tls from 'tls';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carga variables del archivo .env si existen y no están en process.env
 */
export function loadEnvFile() {
    try {
        const envPath = path.resolve(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split(/\r?\n/).forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx === -1) return;
                const key = trimmed.slice(0, eqIdx).trim();
                let val = trimmed.slice(eqIdx + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                if (!process.env[key]) {
                    process.env[key] = val;
                }
            });
        }
    } catch (err) {
        console.warn('Warning reading .env:', err);
    }
}

/**
 * Divide una cadena base64 en líneas de 76 caracteres según RFC 2045
 */
function chunkBase64(b64) {
    return b64.match(/.{1,76}/g)?.join('\r\n') || '';
}

export async function getFirestoreEmailConfig() {
    try {
        const res = await fetch(
            'https://firestore.googleapis.com/v1/projects/unidosec/databases/(default)/documents/settings/email_config'
        );
        if (!res.ok) return null;
        const data = await res.json();
        const fields = data?.fields;
        if (!fields) return null;
        return {
            gmailUser: fields.gmailUser?.stringValue || '',
            gmailAppPassword: fields.gmailAppPassword?.stringValue || '',
            senderName: fields.senderName?.stringValue || 'Unidos EC | EcuFund'
        };
    } catch (_) {
        return null;
    }
}

/**
 * Envía un correo mediante SMTP sobre TLS implícito (smtp.gmail.com:465)
 * utilizando el email de Gmail y un App Password de 16 caracteres.
 */
export async function sendGmailSmtp({
    gmailUser,
    gmailAppPassword,
    to,
    subject,
    text,
    html,
    fromName = 'Unidos EC | EcuFund'
}) {
    loadEnvFile();

    let user = (gmailUser || process.env.GMAIL_USER || process.env.VITE_GMAIL_USER || 'heavencoffee.us@gmail.com').trim();
    let rawPass = (gmailAppPassword || process.env.GMAIL_APP_PASSWORD || process.env.VITE_GMAIL_APP_PASSWORD || '').trim();

    if (!rawPass) {
        const remoteConfig = await getFirestoreEmailConfig();
        if (remoteConfig) {
            if (remoteConfig.gmailUser) user = remoteConfig.gmailUser.trim();
            if (remoteConfig.gmailAppPassword) rawPass = remoteConfig.gmailAppPassword.trim();
            if (remoteConfig.senderName && fromName === 'Unidos EC | EcuFund') {
                fromName = remoteConfig.senderName;
            }
        }
    }

    if (!rawPass) {
        rawPass = 'snky pott mqvd gncz';
    }

    // Las contraseñas de aplicación de Google suelen copiarse con espacios ("xxxx xxxx xxxx xxxx")
    const pass = rawPass.replace(/\s+/g, '');

    if (!user || !pass) {
        const err = new Error('Falta configurar GMAIL_USER o GMAIL_APP_PASSWORD (Contraseña de aplicación de Gmail).');
        err.code = 'MISSING_CREDENTIALS';
        throw err;
    }

    const recipient = (to || '').trim();
    if (!recipient || !recipient.includes('@')) {
        const err = new Error(`Dirección de correo destinatario inválida: "${to}"`);
        err.code = 'INVALID_RECIPIENT';
        throw err;
    }

    return new Promise((resolve, reject) => {
        const socket = tls.connect({
            host: 'smtp.gmail.com',
            port: 465,
            servername: 'smtp.gmail.com',
            rejectUnauthorized: true
        });

        let buffer = '';
        let currentWaiter = null;
        let settled = false;

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                socket.destroy();
                reject(new Error('Tiempo de espera agotado al conectar con smtp.gmail.com:465'));
            }
        }, 20000);

        const cleanup = () => {
            clearTimeout(timeout);
        };

        socket.setEncoding('utf8');

        socket.on('error', (err) => {
            cleanup();
            if (!settled) {
                settled = true;
                reject(err);
            }
        });

        socket.on('close', () => {
            cleanup();
            if (!settled && currentWaiter) {
                settled = true;
                currentWaiter.reject(new Error('Conexión cerrada inesperadamente por el servidor SMTP.'));
            }
        });

        let responseLines = [];

        socket.on('data', (chunk) => {
            buffer += chunk;
            let idx;
            while ((idx = buffer.indexOf('\r\n')) !== -1) {
                const line = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 2);
                responseLines.push(line);

                // En SMTP, la línea final de una respuesta tiene espacio en la posición 3 (ej. "250 OK")
                if (/^\d{3}(?: |$)/.test(line)) {
                    const fullResponse = responseLines.join('\n');
                    const statusCode = parseInt(line.slice(0, 3), 10);
                    responseLines = [];
                    if (currentWaiter) {
                        const waiter = currentWaiter;
                        currentWaiter = null;
                        waiter.resolve({ statusCode, fullResponse });
                    }
                }
            }
        });

        const waitResponse = (expectedPrefix) => {
            return new Promise((res, rej) => {
                currentWaiter = {
                    resolve: ({ statusCode, fullResponse }) => {
                        if (String(statusCode).startsWith(String(expectedPrefix))) {
                            res({ statusCode, fullResponse });
                        } else {
                            if (statusCode === 535 || statusCode === 534) {
                                const authErr = new Error(
                                    'Gmail rechazó las credenciales (Error ' + statusCode + '). Verifica que el correo sea correcto y que estés usando una "Contraseña de aplicación" de 16 letras de Google (no tu clave normal).'
                                );
                                authErr.code = 'AUTH_FAILED';
                                rej(authErr);
                            } else {
                                rej(new Error(`Error SMTP (${statusCode}): ${fullResponse}`));
                            }
                        }
                    },
                    reject: rej
                };
            });
        };

        const sendCmd = (cmd, expectedPrefix) => {
            const p = waitResponse(expectedPrefix);
            socket.write(cmd + '\r\n');
            return p;
        };

        (async () => {
            try {
                // 1. Esperar saludo 220
                await waitResponse(2);

                // 2. EHLO
                await sendCmd('EHLO unidosecuador.org', 2);

                // 3. AUTH LOGIN
                await sendCmd('AUTH LOGIN', 3);
                await sendCmd(Buffer.from(user, 'utf8').toString('base64'), 3);
                await sendCmd(Buffer.from(pass, 'utf8').toString('base64'), 2);

                // 4. MAIL FROM & RCPT TO
                await sendCmd(`MAIL FROM:<${user}>`, 2);
                await sendCmd(`RCPT TO:<${recipient}>`, 2);

                // 5. DATA
                await sendCmd('DATA', 3);

                const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const encodedFromName = `=?UTF-8?B?${Buffer.from(fromName, 'utf8').toString('base64')}?=`;
                const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
                const textBase64 = chunkBase64(Buffer.from(text || '', 'utf8').toString('base64'));
                const htmlBase64 = chunkBase64(Buffer.from(html || text || '', 'utf8').toString('base64'));

                const mimeMessage = [
                    `From: ${encodedFromName} <${user}>`,
                    `To: <${recipient}>`,
                    `Subject: ${encodedSubject}`,
                    `Date: ${new Date().toUTCString()}`,
                    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@unidosecuador.org>`,
                    `MIME-Version: 1.0`,
                    `Content-Type: multipart/alternative; boundary="${boundary}"`,
                    ``,
                    `--${boundary}`,
                    `Content-Type: text/plain; charset=UTF-8`,
                    `Content-Transfer-Encoding: base64`,
                    ``,
                    textBase64,
                    ``,
                    `--${boundary}`,
                    `Content-Type: text/html; charset=UTF-8`,
                    `Content-Transfer-Encoding: base64`,
                    ``,
                    htmlBase64,
                    ``,
                    `--${boundary}--`,
                    `.`,
                ].join('\r\n');

                await sendCmd(mimeMessage, 2);

                // 6. QUIT
                try {
                    socket.write('QUIT\r\n');
                    socket.end();
                } catch (_) {}

                cleanup();
                if (!settled) {
                    settled = true;
                    resolve({ ok: true, to: recipient, from: user });
                }
            } catch (err) {
                cleanup();
                try {
                    socket.destroy();
                } catch (_) {}
                if (!settled) {
                    settled = true;
                    reject(err);
                }
            }
        })();
    });
}

/**
 * Construye los enlaces de redes sociales y el HTML/Texto del correo de campaña aprobada
 */
export function buildCampaignApprovedEmail({
    campaignId,
    campaignTitle,
    organizerName,
    category,
    goal,
    imageUrl,
    baseUrl = 'https://unidosecuador.org'
}) {
    const cleanBase = (baseUrl || 'https://unidosecuador.org').replace(/\/+$/, '');
    const campaignUrl = `${cleanBase}/campaign/${campaignId}`;

    const shareTextWhatsapp = `¡Hola! 🙏 Te invito a conocer y apoyar mi campaña "${campaignTitle}" en Unidos EC. Cada donación y compartida nos acerca a la meta ❤️: ${campaignUrl}`;
    const shareTextSocial = `¡Apoya la campaña "${campaignTitle}" en Unidos EC! Tu ayuda y difusión hacen la diferencia 🙏❤️`;

    const shareLinks = {
        campaignUrl,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWhatsapp)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}&quote=${encodeURIComponent(shareTextSocial)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextSocial)}&url=${encodeURIComponent(campaignUrl)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(campaignUrl)}&text=${encodeURIComponent(shareTextSocial)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(campaignUrl)}`,
        email: `mailto:?subject=${encodeURIComponent(`Apoya esta causa en Unidos EC: ${campaignTitle}`)}&body=${encodeURIComponent(`Hola,\n\nTe invito a conocer y apoyar la campaña "${campaignTitle}" en Unidos EC:\n\n${campaignUrl}\n\n¡Muchas gracias por tu solidaridad y por compartir!`)}`
    };

    const subject = `🎉 ¡Tu campaña "${campaignTitle}" ha sido aprobada en Unidos EC!`;

    const formattedGoal = Number(goal || 0).toLocaleString('es-EC');

    const text = [
        `¡Hola, ${organizerName || 'Organizador'}!`,
        ``,
        `¡Excelentes noticias! Tu campaña "${campaignTitle}" ha sido revisada y APROBADA por el equipo de administración de Unidos EC.`,
        `Tu causa ya está publicada y disponible públicamente para recibir donaciones.`,
        ``,
        `👉 Enlace directo a tu campaña:`,
        `${campaignUrl}`,
        ``,
        `📢 ¡COMPARTE TU CAMPAÑA EN REDES SOCIALES!`,
        `Compartir tu campaña con amigos, familiares y grupos durante los primeros días multiplica tus donaciones:`,
        ``,
        `• Compartir en WhatsApp: ${shareLinks.whatsapp}`,
        `• Compartir en Facebook: ${shareLinks.facebook}`,
        `• Compartir en X (Twitter): ${shareLinks.twitter}`,
        `• Compartir en Telegram: ${shareLinks.telegram}`,
        `• Compartir en LinkedIn: ${shareLinks.linkedin}`,
        `• Para Instagram y TikTok: Copia este enlace y pégalo en tu biografía o historias: ${campaignUrl}`,
        ``,
        `Con cariño,`,
        `El equipo de Unidos EC`
    ].join('\n');

    const imageBannerHtml = imageUrl
        ? `<div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
             <img src="${imageUrl}" alt="${campaignTitle}" style="width: 100%; max-height: 260px; object-fit: cover; display: block;" />
           </div>`
        : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>¡Campaña Aprobada!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #00A86B 0%, #007a4d 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;">
                ✅ Campaña Verificada y Publicada
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; line-height: 1.3;">
                ¡Tu campaña ha sido aprobada! 🎉
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 15px; opacity: 0.95;">
                Ya está visible públicamente y lista para recibir donaciones
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
                Hola <strong>${organizerName || 'Organizador/a'}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Te informamos con mucha alegría que nuestro equipo de administración ha revisado y <strong>aprobado</strong> tu campaña en <strong>Unidos EC</strong>. A partir de este momento cualquier persona puede visitarla y realizar su aporte solidario.
              </p>

              <!-- Campaign Summary Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
                ${imageBannerHtml}
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #00A86B; letter-spacing: 0.5px; margin-bottom: 6px;">
                  ${category || 'Causa Solidaria'} ${goal ? `• Meta: $${formattedGoal} USD` : ''}
                </div>
                <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                  ${campaignTitle}
                </h2>
                <div style="text-align: center;">
                  <a href="${campaignUrl}" target="_blank" style="display: inline-block; background-color: #00A86B; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 12px;">
                    👉 Ver mi campaña publicada
                  </a>
                </div>
              </div>

              <!-- Social Share Section -->
              <div style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 16px; padding: 24px; margin-bottom: 28px;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #14532d; text-align: center;">
                  📢 ¡Comparte tu campaña en Redes Sociales!
                </h3>
                <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.5; color: #166534; text-align: center;">
                  Las campañas que se comparten en las primeras 48 horas logran hasta <strong>3 veces más donaciones</strong>. Haz clic en los botones para difundir tu causa ahora mismo:
                </p>

                <!-- Buttons Grid -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 6px;">
                      <a href="${shareLinks.whatsapp}" target="_blank" style="display: block; background-color: #25D366; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 10px; text-align: center;">
                        💬 Compartir en WhatsApp
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px;">
                      <a href="${shareLinks.facebook}" target="_blank" style="display: block; background-color: #1877F2; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 10px; text-align: center;">
                        📘 Compartir en Facebook
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px;">
                      <a href="${shareLinks.twitter}" target="_blank" style="display: block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 10px; text-align: center;">
                        ✖️ Publicar en X (Twitter)
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px;">
                      <a href="${shareLinks.telegram}" target="_blank" style="display: block; background-color: #0088cc; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 10px; text-align: center;">
                        ✈️ Compartir en Telegram
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px;">
                      <a href="${shareLinks.linkedin}" target="_blank" style="display: block; background-color: #0A66C2; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 10px; text-align: center;">
                        💼 Compartir en LinkedIn
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px;">
                      <a href="${shareLinks.email}" target="_blank" style="display: block; background-color: #475569; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 10px; text-align: center;">
                        ✉️ Enviar por Correo a Amigos
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Instagram / TikTok Copy Link Box -->
                <div style="margin-top: 16px; background-color: #ffffff; border: 1px dashed #86efac; border-radius: 10px; padding: 14px; text-align: center;">
                  <div style="font-size: 12px; font-weight: 700; color: #E4405F; margin-bottom: 6px;">
                    📸 ¿Usas Instagram o TikTok?
                  </div>
                  <div style="font-size: 12px; color: #475569; margin-bottom: 8px;">
                    Copia el enlace de tu campaña y pégalo en tu biografía o en tus Historias (Sticker de Enlace):
                  </div>
                  <div style="background-color: #f1f5f9; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #0f172a; word-break: break-all;">
                    <a href="${campaignUrl}" style="color: #00A86B; text-decoration: underline; font-weight: 700;">${campaignUrl}</a>
                  </div>
                </div>
              </div>

              <!-- Footer note -->
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6; text-align: center;">
                Recuerda que también puedes descargar el <strong>Código QR</strong> de tu campaña desde la página de tu causa para compartirlo en afiches o historias.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 30px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0 0 6px 0; color: #ffffff; font-weight: 700;">Unidos EC | EcuFund</p>
              <p style="margin: 0;">La plataforma solidaria de crowdfunding de Ecuador 🇪🇨</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return {
        subject,
        text,
        html,
        shareLinks
    };
}
