import { db } from '../firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    getDocs,
    limit,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────
export type NotificationType =
    | 'new_message'
    | 'new_reply'
    | 'medical_doc_approved'
    | 'medical_doc_rejected'
    | 'medical_doc_more_info'
    | 'withdrawal_status'
    | 'identity_verified'
    | 'campaign_status'
    | 'system';

export interface Notification {
    id?: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    conversationId?: string | null;
    campaignId?: string | null;
    isRead: boolean;
    createdAt: any;
    actionUrl?: string | null;
}

// ─────────────────────────────────────────────────────────────
// CREAR NOTIFICACIÓN
// ─────────────────────────────────────────────────────────────
export const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    meta?: {
        conversationId?: string;
        campaignId?: string;
        actionUrl?: string;
    }
): Promise<void> => {
    await addDoc(collection(db, 'notifications'), {
        userId,
        type,
        title,
        message,
        conversationId: meta?.conversationId ?? null,
        campaignId: meta?.campaignId ?? null,
        actionUrl: meta?.actionUrl ?? null,
        isRead: false,
        createdAt: serverTimestamp(),
    } satisfies Omit<Notification, 'id'>);
};

// ─────────────────────────────────────────────────────────────
// SUSCRIPCIÓN: NOTIFICACIONES DEL USUARIO (tiempo real)
// ─────────────────────────────────────────────────────────────
export const subscribeToUserNotifications = (
    userId: string,
    callback: (notifications: Notification[]) => void
) => {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[]);
    });
};

// ─────────────────────────────────────────────────────────────
// MARCAR NOTIFICACIÓN COMO LEÍDA
// ─────────────────────────────────────────────────────────────
export const markNotificationRead = async (notificationId: string): Promise<void> => {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
};

// ─────────────────────────────────────────────────────────────
// MARCAR TODAS COMO LEÍDAS
// ─────────────────────────────────────────────────────────────
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
};

// ─────────────────────────────────────────────────────────────
// HELPER: TIEMPO RELATIVO
// ─────────────────────────────────────────────────────────────
export const timeAgo = (timestamp: any): string => {
    if (!timestamp?.seconds) return 'Ahora';
    const now = Date.now();
    const then = timestamp.seconds * 1000;
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
};

// ─────────────────────────────────────────────────────────────
// ÍCONO POR TIPO DE NOTIFICACIÓN
// ─────────────────────────────────────────────────────────────
export const notificationIcon = (type: NotificationType): string => {
    const icons: Record<NotificationType, string> = {
        new_message: '💬',
        new_reply: '↩️',
        medical_doc_approved: '✅',
        medical_doc_rejected: '❌',
        medical_doc_more_info: '📄',
        withdrawal_status: '🔒',
        identity_verified: '✅',
        campaign_status: '📢',
        system: '🔔',
    };
    return icons[type] ?? '🔔';
};

// ─────────────────────────────────────────────────────────────
// MENSAJES AUTOMÁTICOS DEL SISTEMA
// ─────────────────────────────────────────────────────────────
export const sendSystemNotification = {
    medicalDocRequired: (userId: string, campaignId: string) =>
        createNotification(userId, 'medical_doc_more_info',
            'Documentación médica requerida',
            '📄 Se requiere documentación médica para continuar con la verificación de su campaña.',
            { campaignId, actionUrl: `/campaign/${campaignId}` }
        ),
    medicalDocRejected: (userId: string, campaignId: string, reason: string) =>
        createNotification(userId, 'medical_doc_rejected',
            'Documentación rechazada',
            `⚠️ ${reason || 'La documentación presentada requiere corrección. Revise el mensaje del administrador.'}`,
            { campaignId, actionUrl: `/campaign/${campaignId}` }
        ),
    medicalDocApproved: (userId: string, campaignId: string) =>
        createNotification(userId, 'medical_doc_approved',
            'Documentación médica aprobada',
            '✅ Su documentación médica ha sido verificada correctamente.',
            { campaignId, actionUrl: `/campaign/${campaignId}` }
        ),
    withdrawalBlocked: (userId: string, campaignId: string) =>
        createNotification(userId, 'withdrawal_status',
            'Retiro no disponible',
            '🔒 Su retiro todavía no está disponible. Revise los requisitos pendientes en su cuenta.',
            { campaignId, actionUrl: `/campaign/${campaignId}` }
        ),
    newAdminMessage: (userId: string, conversationId: string, subject: string) =>
        createNotification(userId, 'new_message',
            '🔔 Nuevo mensaje de Administración',
            subject,
            { conversationId, actionUrl: `/profile?tab=messages&conv=${conversationId}` }
        ),
    newUserReply: (adminEmail: string, conversationId: string, userName: string) =>
        createNotification(adminEmail, 'new_reply',
            '↩️ Nueva respuesta de usuario',
            `${userName} ha respondido a su mensaje.`,
            { conversationId }
        ),
    campaignApproved: (userId: string, campaignId: string, title: string) =>
        createNotification(userId, 'campaign_status',
            '🎉 Campaña Aprobada y Publicada',
            `Tu campaña "${title}" ha sido aprobada por la administración y ya está visible para recibir donaciones.`,
            { campaignId, actionUrl: `/campaign/${campaignId}` }
        ),
};
