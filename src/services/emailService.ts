import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface EmailConfig {
    gmailUser: string;
    gmailAppPassword: string;
    senderName: string;
    updatedAt?: any;
}

export interface CampaignShareLinks {
    campaignUrl: string;
    whatsapp: string;
    facebook: string;
    twitter: string;
    telegram: string;
    linkedin: string;
    email: string;
}

const DEFAULT_BASE_URL = 'https://unidosecuador.org';

/**
 * Genera los enlaces de compartir en redes sociales para una campaña aprobada
 */
export const getCampaignShareLinks = (
    campaignId: string,
    campaignTitle: string,
    baseUrl?: string
): CampaignShareLinks => {
    const origin =
        baseUrl ||
        (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
            ? window.location.origin
            : DEFAULT_BASE_URL);

    const cleanBase = origin.replace(/\/+$/, '');
    const campaignUrl = `${cleanBase}/campaign/${campaignId}`;

    const shareTextWhatsapp = `¡Hola! 🙏 Te invito a conocer y apoyar mi campaña "${campaignTitle}" en Unidos EC. Cada donación y compartida nos acerca a la meta ❤️: ${campaignUrl}`;
    const shareTextSocial = `¡Apoya la campaña "${campaignTitle}" en Unidos EC! Tu ayuda y difusión hacen la diferencia 🙏❤️`;

    return {
        campaignUrl,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWhatsapp)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}&quote=${encodeURIComponent(shareTextSocial)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextSocial)}&url=${encodeURIComponent(campaignUrl)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(campaignUrl)}&text=${encodeURIComponent(shareTextSocial)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(campaignUrl)}`,
        email: `mailto:?subject=${encodeURIComponent(`Apoya esta causa en Unidos EC: ${campaignTitle}`)}&body=${encodeURIComponent(`Hola,\n\nTe invito a conocer y apoyar la campaña "${campaignTitle}" en Unidos EC:\n\n${campaignUrl}\n\n¡Muchas gracias por tu solidaridad y por compartir!`)}`
    };
};

/**
 * Construye el texto del mensaje interno con enlaces de compartir cuando se aprueba una campaña
 */
export const buildApprovalInternalMessage = (
    organizerName: string,
    campaignTitle: string,
    campaignId: string
): { subject: string; message: string; shareLinks: CampaignShareLinks } => {
    const shareLinks = getCampaignShareLinks(campaignId, campaignTitle);

    const subject = `🎉 ¡Tu campaña "${campaignTitle}" ha sido aprobada!`;
    const message = [
        `¡Hola, ${organizerName || 'Organizador/a'}! 🎉`,
        ``,
        `Tu campaña "${campaignTitle}" ha sido revisada y APROBADA por la administración de Unidos EC. ¡Ya está publicada y visible para recibir donaciones!`,
        ``,
        `🔗 Enlace directo a tu campaña:`,
        `${shareLinks.campaignUrl}`,
        ``,
        `📢 ¡Comparte tu campaña en redes sociales para llegar a más donantes!`,
        `• WhatsApp: ${shareLinks.whatsapp}`,
        `• Facebook: ${shareLinks.facebook}`,
        `• X (Twitter): ${shareLinks.twitter}`,
        `• Telegram: ${shareLinks.telegram}`,
        `• LinkedIn: ${shareLinks.linkedin}`,
        `• Instagram / TikTok: Copia el enlace directo (${shareLinks.campaignUrl}) y pégalo en tu biografía o Historias.`,
        ``,
        `¡Te deseamos mucho éxito alcanzando tu meta!`,
        `Equipo de Unidos EC`
    ].join('\n');

    return { subject, message, shareLinks };
};

/**
 * Obtiene la configuración de correo Gmail (App Password) guardada en Firestore
 */
export const getEmailConfig = async (): Promise<EmailConfig> => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'email_config'));
        if (snap.exists()) {
            const data = snap.data();
            return {
                gmailUser: data.gmailUser || 'heavencoffee.us@gmail.com',
                gmailAppPassword: data.gmailAppPassword || 'snkypottmqvdgncz',
                senderName: data.senderName || 'Unidos EC | EcuFund',
                updatedAt: data.updatedAt
            };
        }
    } catch (e) {
        console.warn('No se pudo leer settings/email_config:', e);
    }
    return {
        gmailUser: 'heavencoffee.us@gmail.com',
        gmailAppPassword: 'snkypottmqvdgncz',
        senderName: 'Unidos EC | EcuFund'
    };
};

/**
 * Guarda la configuración de correo Gmail (App Password) en Firestore
 */
export const saveEmailConfig = async (config: EmailConfig): Promise<void> => {
    await setDoc(
        doc(db, 'settings', 'email_config'),
        {
            gmailUser: config.gmailUser.trim(),
            gmailAppPassword: config.gmailAppPassword.replace(/\s+/g, ''),
            senderName: (config.senderName || 'Unidos EC | EcuFund').trim(),
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );
};

/**
 * Envía el correo electrónico automático de aprobación de campaña al organizador
 */
export const sendCampaignApprovalEmail = async (campaign: {
    id: string;
    title: string;
    category?: string;
    goal?: number;
    imageUrl?: string;
    organizer?: {
        name?: string;
        email?: string;
    };
}): Promise<{
    ok: boolean;
    to?: string;
    shareLinks: CampaignShareLinks;
    error?: string;
    code?: string;
}> => {
    const shareLinks = getCampaignShareLinks(campaign.id, campaign.title);
    const toEmail = campaign.organizer?.email?.trim();

    if (!toEmail) {
        return {
            ok: false,
            shareLinks,
            code: 'NO_ORGANIZER_EMAIL',
            error: 'La campaña no tiene un correo electrónico de organizador registrado.'
        };
    }

    try {
        const config = await getEmailConfig();

        const response = await fetch('/api/send-approval-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: toEmail,
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                organizerName: campaign.organizer?.name || 'Organizador',
                category: campaign.category || 'Causa Solidaria',
                goal: campaign.goal || 0,
                imageUrl: campaign.imageUrl || '',
                baseUrl: DEFAULT_BASE_URL,
                gmailUser: config.gmailUser,
                gmailAppPassword: config.gmailAppPassword,
                senderName: config.senderName
            })
        });

        const data = await response.json();

        // Registrar en historial de correos en Firestore
        await addDoc(collection(db, 'email_logs'), {
            type: 'CAMPAIGN_APPROVED',
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            to: toEmail,
            status: data.ok ? 'SENT' : 'FAILED',
            error: data.error || null,
            createdAt: serverTimestamp()
        }).catch(() => {});

        if (!response.ok || !data.ok) {
            return {
                ok: false,
                to: toEmail,
                shareLinks,
                code: data.code || 'EMAIL_ERROR',
                error: data.error || 'No se pudo enviar el correo.'
            };
        }

        // Marcar en la campaña que ya se envió el correo de aprobación
        await updateDoc(doc(db, 'campaigns', campaign.id), {
            approvalEmailSent: true,
            approvalEmailSentAt: serverTimestamp()
        }).catch(() => {});

        return {
            ok: true,
            to: toEmail,
            shareLinks: data.shareLinks || shareLinks
        };
    } catch (err: any) {
        console.error('Error calling /api/send-approval-email:', err);
        return {
            ok: false,
            to: toEmail,
            shareLinks,
            code: 'NETWORK_ERROR',
            error: err?.message || 'Error de conexión con el servidor de correo.'
        };
    }
};

/**
 * Envía un correo de prueba para verificar la Contraseña de Aplicación de Gmail
 */
export const sendTestGmailEmail = async (params: {
    to: string;
    gmailUser: string;
    gmailAppPassword: string;
    senderName?: string;
}): Promise<{ ok: boolean; error?: string }> => {
    try {
        const response = await fetch('/api/test-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: params.to.trim(),
                gmailUser: params.gmailUser.trim(),
                gmailAppPassword: params.gmailAppPassword.replace(/\s+/g, ''),
                senderName: params.senderName || 'Unidos EC | EcuFund'
            })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
            return { ok: false, error: data.error || 'Error al enviar correo de prueba.' };
        }
        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Error de red al probar correo.' };
    }
};
