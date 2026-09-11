import { db, storage } from '../firebase';
import {
    doc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─────────────────────────────────────────────────────────────
// CATEGORÍAS QUE REQUIEREN VERIFICACIÓN MÉDICA OBLIGATORIA
// ─────────────────────────────────────────────────────────────
export const MEDICAL_CATEGORIES: string[] = ['Salud', 'Emergencia'];

export const isMedicalCampaign = (category: string): boolean =>
    MEDICAL_CATEGORIES.includes(category);

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────
export type MedicalDocumentStatus =
    | 'not_required'
    | 'pending_upload'
    | 'uploaded'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'more_info_required';

export interface MedicalVerificationLog {
    id?: string;
    campaignId: string;
    campaignTitle: string;
    userId: string;
    adminId?: string;
    action: 'uploaded' | 'approved' | 'rejected' | 'more_info_requested' | 'resubmitted';
    statusBefore: MedicalDocumentStatus;
    statusAfter: MedicalDocumentStatus;
    adminNote?: string;
    documentUrl?: string;
    timestamp: any;
}

export interface WithdrawalAuthorization {
    allowed: boolean;
    blockedBy: string[];
}

// ─────────────────────────────────────────────────────────────
// MOTOR DE AUTORIZACIÓN DE RETIROS (CAPA FRONTEND)
// También existe como barrera en Firestore Security Rules
// ─────────────────────────────────────────────────────────────
export const canWithdraw = (campaign: any): WithdrawalAuthorization => {
    const blockedBy: string[] = [];

    // 1. Meta mínima: debe haber fondos
    if ((campaign.currentAmount ?? 0) <= 0) {
        blockedBy.push('NO_FUNDS');
    }

    // 2. Verificación médica obligatoria cuando aplica
    if (campaign.medicalDocumentRequired === true) {
        const medStatus: MedicalDocumentStatus = campaign.medicalDocumentStatus ?? 'pending_upload';
        if (medStatus !== 'approved') {
            blockedBy.push(`MEDICAL_DOC_NOT_APPROVED:${medStatus}`);
        }
    }

    return {
        allowed: blockedBy.length === 0,
        blockedBy,
    };
};

// ─────────────────────────────────────────────────────────────
// SUBIR DOCUMENTO MÉDICO (organizador)
// Ruta privada: medical_docs/{campaignId}/{timestamp}_{filename}
// ─────────────────────────────────────────────────────────────
export const uploadMedicalDocument = async (
    campaignId: string,
    file: File,
    userId: string
): Promise<string> => {
    const cleanName = file.name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
    const path = `medical_docs/${campaignId}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const prevSnap = await getDoc(doc(db, 'campaigns', campaignId));
    const prevStatus: MedicalDocumentStatus = prevSnap.exists()
        ? (prevSnap.data().medicalDocumentStatus ?? 'pending_upload')
        : 'pending_upload';

    const newStatus: MedicalDocumentStatus = 'under_review';

    // Actualizar campaña
    await updateDoc(doc(db, 'campaigns', campaignId), {
        medicalDocumentUrl: downloadURL,
        medicalDocumentStatus: newStatus,
        medicalDocumentUploadedAt: serverTimestamp(),
    });

    // Log de auditoría
    const campaignSnap = await getDoc(doc(db, 'campaigns', campaignId));
    await addDoc(collection(db, 'medical_verification_log'), {
        campaignId,
        campaignTitle: campaignSnap.exists() ? campaignSnap.data().title : '',
        userId,
        action: (prevStatus === 'rejected' || prevStatus === 'more_info_required')
            ? 'resubmitted'
            : 'uploaded',
        statusBefore: prevStatus,
        statusAfter: newStatus,
        documentUrl: downloadURL,
        timestamp: serverTimestamp(),
    } satisfies Omit<MedicalVerificationLog, 'id'>);

    return downloadURL;
};

// ─────────────────────────────────────────────────────────────
// ACTUALIZAR ESTADO — solo admin (protegido también en Firestore Rules)
// ─────────────────────────────────────────────────────────────
export const updateMedicalDocumentStatus = async (
    campaignId: string,
    newStatus: MedicalDocumentStatus,
    adminId: string,
    adminNote: string
): Promise<void> => {
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) throw new Error('Campaign not found');

    const prevStatus: MedicalDocumentStatus =
        (campaignSnap.data().medicalDocumentStatus as MedicalDocumentStatus) ?? 'pending_upload';

    await updateDoc(campaignRef, {
        medicalDocumentStatus: newStatus,
        medicalAdminNote: adminNote,
        medicalReviewedBy: adminId,
        medicalReviewedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'medical_verification_log'), {
        campaignId,
        campaignTitle: campaignSnap.data().title ?? '',
        userId: campaignSnap.data().organizer?.email ?? '',
        adminId,
        action: newStatus === 'approved'
            ? 'approved'
            : newStatus === 'rejected'
                ? 'rejected'
                : 'more_info_requested',
        statusBefore: prevStatus,
        statusAfter: newStatus,
        adminNote,
        documentUrl: campaignSnap.data().medicalDocumentUrl ?? '',
        timestamp: serverTimestamp(),
    } satisfies Omit<MedicalVerificationLog, 'id'>);
};

// ─────────────────────────────────────────────────────────────
// OBTENER LOG DE AUDITORÍA DE UNA CAMPAÑA
// ─────────────────────────────────────────────────────────────
export const getMedicalVerificationLog = async (
    campaignId: string
): Promise<MedicalVerificationLog[]> => {
    const q = query(
        collection(db, 'medical_verification_log'),
        where('campaignId', '==', campaignId),
        orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as MedicalVerificationLog[];
};

// ─────────────────────────────────────────────────────────────
// OBTENER CAMPAÑAS CON VERIFICACIÓN MÉDICA (para el panel admin)
// ─────────────────────────────────────────────────────────────
export const getAllMedicalCampaigns = async (): Promise<any[]> => {
    const q = query(
        collection(db, 'campaigns'),
        where('medicalDocumentRequired', '==', true),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
