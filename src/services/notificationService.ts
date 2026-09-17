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
    userEmail?: string | null;
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
        userEmail?: string | null;
        conversationId?: string;
        campaignId?: string;
        actionUrl?: string;
    }
): Promise<void> => {
    await addDoc(collection(db, 'notifications'), {
        userId: userId || '',
        userEmail: meta?.userEmail ?? null,
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
    callback: (notifications: Notification[]) => void,
    userEmail?: string | null
) => {
    if (!userId && !userEmail) {
        callback([]);
        return () => {};
    }

    const notifsMap = new Map<string, Notification>();

    const updateCallback = () => {
        const sorted = Array.from(notifsMap.values()).sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
        });
        callback(sorted.slice(0, 50));
    };

    const unsubs: (() => void)[] = [];

    // Consulta por userId (UID)
    if (userId) {
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId)
            );
            const unsub = onSnapshot(q, (snap) => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'removed') {
                        notifsMap.delete(change.doc.id);
                    } else {
                        notifsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Notification);
                    }
                });
                updateCallback();
            }, (err) => {
                console.warn("Notifications subscription warning (userId):", err);
            });
            unsubs.push(unsub);
        } catch (e) {
            console.warn("Error setting up notifications query for userId:", e);
        }
    }

    // Consulta por userEmail (si existe y es diferente de userId)
    if (userEmail && userEmail !== userId) {
        try {
            const qEmail = query(
                collection(db, 'notifications'),
                where('userEmail', '==', userEmail)
            );
            const unsubEmail = onSnapshot(qEmail, (snap) => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'removed') {
                        notifsMap.delete(change.doc.id);
                    } else {
                        notifsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Notification);
                    }
                });
                updateCallback();
            }, (err) => {
                console.warn("Notifications subscription warning (userEmail):", err);
            });
            unsubs.push(unsubEmail);

            // También buscar donde userId contenga el email (mensajes antiguos o fallback)
            const qLegacy = query(
                collection(db, 'notifications'),
                where('userId', '==', userEmail)
            );
            const unsubLegacy = onSnapshot(qLegacy, (snap) => {
                snap.docChanges().forEach(change => {
                    if (change.type === 'removed') {
                        notifsMap.delete(change.doc.id);
                    } else {
                        notifsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() } as Notification);
                    }
                });
                updateCallback();
            }, (err) => {
                console.warn("Notifications subscription warning (legacy email):", err);
            });
            unsubs.push(unsubLegacy);
        } catch (e) {
            console.warn("Error setting up email notifications query:", e);
        }
    }

    return () => {
        unsubs.forEach(u => u());
    };
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
export const markAllNotificationsRead = async (userId: string, userEmail?: string | null): Promise<void> => {
    const batch = writeBatch(db);
    const promises = [];

    if (userId) {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );
        promises.push(getDocs(q));
    }

    if (userEmail && userEmail !== userId) {
        const qEmail = query(
            collection(db, 'notifications'),
            where('userEmail', '==', userEmail),
            where('isRead', '==', false)
        );
        promises.push(getDocs(qEmail));

        const qLegacy = query(
            collection(db, 'notifications'),
            where('userId', '==', userEmail),
            where('isRead', '==', false)
        );
        promises.push(getDocs(qLegacy));
    }

    const results = await Promise.all(promises);
    const seenIds = new Set<string>();

    results.forEach(snap => {
        snap.docs.forEach(d => {
            if (!seenIds.has(d.id)) {
                seenIds.add(d.id);
                batch.update(d.ref, { isRead: true });
            }
        });
    });

    if (seenIds.size > 0) {
        await batch.commit();
    }
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
    medicalDocRequired: (userId: string, campaignId: string, userEmail?: string | null) =>
        createNotification(userId, 'medical_doc_more_info',
            'Documentación médica requerida',
            '📄 Se requiere documentación médica para continuar con la verificación de su campaña.',
            { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
        ),
    medicalDocRejected: (userId: string, campaignId: string, reason: string, userEmail?: string | null) =>
        createNotification(userId, 'medical_doc_rejected',
            'Documentación rechazada',
            `⚠️ ${reason || 'La documentación presentada requiere corrección. Revise el mensaje del administrador.'}`,
            { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
        ),
    medicalDocApproved: (userId: string, campaignId: string, userEmail?: string | null) =>
        createNotification(userId, 'medical_doc_approved',
            'Documentación médica aprobada',
            '✅ Su documentación médica ha sido verificada correctamente.',
            { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
        ),
    verificationDocReviewed: (
        userId: string,
        campaignId: string,
        docTitle: string,
        status: 'approved' | 'rejected' | 'more_info_required',
        note?: string,
        userEmail?: string | null
    ) => {
        if (status === 'approved') {
            return createNotification(userId, 'medical_doc_approved',
                `✅ ${docTitle} Aprobado`,
                `Tu documento (${docTitle}) ha sido verificado y aprobado por nuestro equipo de auditoría.`,
                { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
            );
        } else if (status === 'rejected') {
            return createNotification(userId, 'medical_doc_rejected',
                `❌ ${docTitle} Requiere Corrección`,
                `⚠️ Motivo: ${note || 'El documento no cumple con los requisitos.'} Por favor sube un nuevo archivo.`,
                { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
            );
        } else {
            return createNotification(userId, 'medical_doc_more_info',
                `📄 Información adicional para ${docTitle}`,
                `ℹ️ ${note || 'Se requiere documentación complementaria para validar este respaldo.'}`,
                { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
            );
        }
    },
    withdrawalStatus: (userId: string, campaignId: string, status: 'completed' | 'rejected', userEmail?: string | null) =>
        createNotification(userId, 'withdrawal_status',
            status === 'completed' ? 'Retiro completado' : 'Retiro rechazado',
            status === 'completed'
                ? '✅ Su solicitud de retiro ha sido procesada y completada con éxito.'
                : '❌ Su solicitud de retiro no pudo ser procesada. Contacte a soporte para más detalles.',
            { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
        ),
    withdrawalBlocked: (userId: string, campaignId: string, userEmail?: string | null) =>
        createNotification(userId, 'withdrawal_status',
            'Retiro no disponible',
            '🔒 Su retiro todavía no está disponible. Revise los requisitos pendientes en su cuenta.',
            { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
        ),
    newAdminMessage: (userId: string, conversationId: string, subject: string, userEmail?: string | null) =>
        createNotification(userId, 'new_message',
            '🔔 Nuevo mensaje de Administración',
            subject,
            { conversationId, userEmail, actionUrl: `/profile?tab=messages&conv=${conversationId}` }
        ),
    newUserReply: (adminEmail: string, conversationId: string, userName: string) =>
        createNotification(adminEmail, 'new_reply',
            '↩️ Nueva respuesta de usuario',
            `${userName} ha respondido a su mensaje.`,
            { conversationId }
        ),
    campaignApproved: (userId: string, campaignId: string, title: string, userEmail?: string | null) =>
        createNotification(userId, 'campaign_status',
            '🎉 Campaña Aprobada y Publicada',
            `Tu campaña "${title}" ha sido aprobada por la administración y ya está visible para recibir donaciones.`,
            { campaignId, userEmail, actionUrl: `/campaign/${campaignId}` }
        ),
};
