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
    getDocs,
    getDoc,
    increment,
    writeBatch,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────
export type ConversationStatus =
    | 'open'
    | 'waiting_for_user'
    | 'waiting_for_admin'
    | 'resolved'
    | 'closed'
    | 'archived';

export type MessageCategory =
    | 'Verificación de identidad'
    | 'Verificación bancaria'
    | 'Verificación de campaña'
    | 'Documentación médica'
    | 'Retiro de fondos'
    | 'Seguridad'
    | 'Donaciones'
    | 'Campaña'
    | 'Soporte'
    | 'Otro';

export interface Conversation {
    id?: string;
    userId: string;
    userEmail: string;
    userName: string;
    campaignId?: string | null;
    campaignTitle?: string | null;
    subject: string;
    category: MessageCategory;
    status: ConversationStatus;
    createdAt: any;
    updatedAt: any;
    lastMessageAt: any;
    lastMessagePreview: string;
    unreadByUser: number;
    unreadByAdmin: number;
    createdByAdmin: string;
}

export interface Message {
    id?: string;
    conversationId: string;
    senderId: string;
    senderType: 'admin' | 'user';
    senderName: string;
    message: string;
    isReadByUser: boolean;
    isReadByAdmin: boolean;
    createdAt: any;
}

// ─────────────────────────────────────────────────────────────
// CREAR CONVERSACIÓN (solo admin)
// ─────────────────────────────────────────────────────────────
export const createConversation = async (
    data: {
        userId: string;
        userEmail: string;
        userName: string;
        campaignId?: string;
        campaignTitle?: string;
        subject: string;
        category: MessageCategory;
        firstMessage: string;
        adminId: string;
        adminName: string;
    }
): Promise<string> => {
    const now = serverTimestamp();

    const convRef = await addDoc(collection(db, 'conversations'), {
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        campaignId: data.campaignId ?? null,
        campaignTitle: data.campaignTitle ?? null,
        subject: data.subject,
        category: data.category,
        status: 'waiting_for_user' as ConversationStatus,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        lastMessagePreview: data.firstMessage.substring(0, 100),
        unreadByUser: 1,
        unreadByAdmin: 0,
        createdByAdmin: data.adminId,
    } satisfies Omit<Conversation, 'id'>);

    // Crear primer mensaje
    await addDoc(collection(db, 'conversations', convRef.id, 'messages'), {
        conversationId: convRef.id,
        senderId: data.adminId,
        senderType: 'admin' as const,
        senderName: data.adminName,
        message: data.firstMessage,
        isReadByUser: false,
        isReadByAdmin: true,
        createdAt: now,
    } satisfies Omit<Message, 'id'>);

    return convRef.id;
};

// ─────────────────────────────────────────────────────────────
// ENVIAR MENSAJE (usuario o admin)
// ─────────────────────────────────────────────────────────────
export const sendMessage = async (
    conversationId: string,
    message: string,
    senderType: 'admin' | 'user',
    senderId: string,
    senderName: string
): Promise<void> => {
    const now = serverTimestamp();
    const batch = writeBatch(db);

    const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    batch.set(msgRef, {
        conversationId,
        senderId,
        senderType,
        senderName,
        message,
        isReadByUser: senderType === 'user',
        isReadByAdmin: senderType === 'admin',
        createdAt: now,
    } satisfies Omit<Message, 'id'>);

    const convRef = doc(db, 'conversations', conversationId);
    const newStatus: ConversationStatus =
        senderType === 'admin' ? 'waiting_for_user' : 'waiting_for_admin';

    batch.update(convRef, {
        lastMessageAt: now,
        updatedAt: now,
        lastMessagePreview: message.substring(0, 100),
        status: newStatus,
        ...(senderType === 'admin'
            ? { unreadByUser: increment(1) }
            : { unreadByAdmin: increment(1) }),
    });

    await batch.commit();
};

// ─────────────────────────────────────────────────────────────
// SUSCRIPCIÓN: CONVERSACIONES DE UN USUARIO (tiempo real)
// ─────────────────────────────────────────────────────────────
export const subscribeToUserConversations = (
    userId: string,
    callback: (conversations: Conversation[]) => void
) => {
    const q = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        orderBy('lastMessageAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Conversation[]);
    });
};

// ─────────────────────────────────────────────────────────────
// SUSCRIPCIÓN: TODOS LOS MENSAJES DE UNA CONVERSACIÓN (tiempo real)
// ─────────────────────────────────────────────────────────────
export const subscribeToMessages = (
    conversationId: string,
    callback: (messages: Message[]) => void
) => {
    const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Message[]);
    });
};

// ─────────────────────────────────────────────────────────────
// SUSCRIPCIÓN: TODAS LAS CONVERSACIONES (admin, tiempo real)
// ─────────────────────────────────────────────────────────────
export const subscribeToAllConversations = (
    callback: (conversations: Conversation[]) => void
) => {
    const q = query(
        collection(db, 'conversations'),
        orderBy('lastMessageAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Conversation[]);
    });
};

// ─────────────────────────────────────────────────────────────
// MARCAR MENSAJES COMO LEÍDOS
// ─────────────────────────────────────────────────────────────
export const markConversationAsRead = async (
    conversationId: string,
    readerType: 'user' | 'admin'
): Promise<void> => {
    const batch = writeBatch(db);

    // Actualizar contador en la conversación
    const convRef = doc(db, 'conversations', conversationId);
    batch.update(convRef, {
        [readerType === 'user' ? 'unreadByUser' : 'unreadByAdmin']: 0,
    });

    // Marcar todos los mensajes no leídos como leídos
    const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        where(readerType === 'user' ? 'isReadByUser' : 'isReadByAdmin', '==', false)
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
        batch.update(d.ref, {
            [readerType === 'user' ? 'isReadByUser' : 'isReadByAdmin']: true,
        });
    });

    await batch.commit();
};

// ─────────────────────────────────────────────────────────────
// ACTUALIZAR ESTADO DE CONVERSACIÓN (admin)
// ─────────────────────────────────────────────────────────────
export const updateConversationStatus = async (
    conversationId: string,
    status: ConversationStatus
): Promise<void> => {
    await updateDoc(doc(db, 'conversations', conversationId), {
        status,
        updatedAt: serverTimestamp(),
    });
};

// ─────────────────────────────────────────────────────────────
// OBTENER CONVERSACIÓN POR ID
// ─────────────────────────────────────────────────────────────
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
    const snap = await getDoc(doc(db, 'conversations', conversationId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Conversation;
};

// ─────────────────────────────────────────────────────────────
// CONTADOR TOTAL SIN LEER PARA ADMIN
// ─────────────────────────────────────────────────────────────
export const subscribeToAdminUnreadCount = (
    callback: (count: number) => void
) => {
    const q = query(
        collection(db, 'conversations'),
        where('unreadByAdmin', '>', 0)
    );
    return onSnapshot(q, (snap) => {
        const total = snap.docs.reduce(
            (sum, d) => sum + ((d.data().unreadByAdmin as number) || 0), 0
        );
        callback(total);
    });
};
