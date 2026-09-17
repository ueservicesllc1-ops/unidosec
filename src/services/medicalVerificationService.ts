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
export const MEDICAL_CATEGORIES: string[] = [
    'Salud', 'Emergencia', 'salud', 'emergencia',
    'Médica', 'médica', 'Medica', 'medica',
    'Tratamiento', 'tratamiento', 'Hospital', 'hospital'
];

export const isMedicalCampaign = (category?: string): boolean => {
    if (!category) return false;
    const clean = category.trim().toLowerCase();
    return MEDICAL_CATEGORIES.some(cat => cat.toLowerCase() === clean) ||
        clean.includes('salud') ||
        clean.includes('medic') ||
        clean.includes('emergenc') ||
        clean.includes('quirurg') ||
        clean.includes('cancer') ||
        clean.includes('hospit');
};

export const isCampaignRequiringMedicalDoc = (campaign: any): boolean => {
    if (!campaign) return false;
    if (campaign.medicalDocumentRequired === true) return true;
    if (campaign.medicalDocumentRequired === false) return false;
    // Fallback para campañas creadas con categoría médica o títulos de salud
    return isMedicalCampaign(campaign.category) || isMedicalCampaign(campaign.title);
};

// ─────────────────────────────────────────────────────────────
// TIPOS DE DOCUMENTOS DE VERIFICACIÓN
// ─────────────────────────────────────────────────────────────
export type VerificationDocType =
    | 'medical'
    | 'id_card'
    | 'bank_certificate'
    | 'authorization_letter'
    | 'additional';

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
    docType?: VerificationDocType;
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

    if (!campaign) {
        return { allowed: false, blockedBy: ['CAMPAIGN_NOT_FOUND'] };
    }

    // 1. Meta mínima: debe haber fondos recaudados
    if ((campaign.currentAmount ?? 0) <= 0) {
        blockedBy.push('NO_FUNDS');
    }

    // 2. Verificación médica obligatoria cuando aplica
    if (isCampaignRequiringMedicalDoc(campaign)) {
        const medStatus: MedicalDocumentStatus = campaign.medicalDocumentStatus ?? 'pending_upload';
        if (medStatus !== 'approved') {
            blockedBy.push(`MEDICAL_DOC_NOT_APPROVED:${medStatus}`);
        }
    }

    // 3. Verificación de Cédula si fue rechazada
    if (campaign.idDocumentStatus === 'rejected') {
        blockedBy.push('ID_DOC_REJECTED');
    }

    // 4. Verificación Bancaria si fue rechazada
    if (campaign.bankCertificateStatus === 'rejected') {
        blockedBy.push('BANK_CERT_REJECTED');
    }

    return {
        allowed: blockedBy.length === 0,
        blockedBy,
    };
};

// ─────────────────────────────────────────────────────────────
// SUBIR CUALQUIER DOCUMENTO DE VERIFICACIÓN (organizador)
// Admite PDF, JPG, PNG, DOCX de hasta 20MB
// ─────────────────────────────────────────────────────────────
export const uploadVerificationDocument = async (
    campaignId: string,
    file: File,
    docType: VerificationDocType,
    userId: string
): Promise<string> => {
    if (!file) throw new Error('No se ha proporcionado ningún archivo.');

    // Validar tamaño: máximo 20MB
    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`El archivo supera el límite permitido de ${MAX_SIZE_MB}MB. Por favor comprímelo o elige uno más liviano.`);
    }

    const cleanName = file.name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
    const path = `verification_docs/${campaignId}/${docType}_${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const prevSnap = await getDoc(doc(db, 'campaigns', campaignId));
    const campaignData = prevSnap.exists() ? prevSnap.data() : {};

    let updateFields: Record<string, any> = {};
    let statusField = 'medicalDocumentStatus';
    let prevStatus: MedicalDocumentStatus = 'pending_upload';

    switch (docType) {
        case 'medical':
            statusField = 'medicalDocumentStatus';
            prevStatus = campaignData.medicalDocumentStatus ?? 'pending_upload';
            updateFields = {
                medicalDocumentUrl: downloadURL,
                medicalDocumentStatus: 'under_review',
                medicalDocumentUploadedAt: serverTimestamp(),
            };
            break;
        case 'id_card':
            statusField = 'idDocumentStatus';
            prevStatus = campaignData.idDocumentStatus ?? 'pending_upload';
            updateFields = {
                idDocumentUrl: downloadURL,
                idDocumentStatus: 'under_review',
                idDocumentUploadedAt: serverTimestamp(),
            };
            break;
        case 'bank_certificate':
            statusField = 'bankCertificateStatus';
            prevStatus = campaignData.bankCertificateStatus ?? 'pending_upload';
            updateFields = {
                bankCertificateUrl: downloadURL,
                bankCertificateStatus: 'under_review',
                bankCertificateUploadedAt: serverTimestamp(),
            };
            break;
        case 'authorization_letter':
            statusField = 'authorizationLetterStatus';
            prevStatus = campaignData.authorizationLetterStatus ?? 'pending_upload';
            updateFields = {
                authorizationLetterUrl: downloadURL,
                authorizationLetterStatus: 'under_review',
                authorizationLetterUploadedAt: serverTimestamp(),
            };
            break;
        case 'additional':
            updateFields = {
                additionalVerificationDocUrl: downloadURL,
                additionalVerificationUploadedAt: serverTimestamp(),
            };
            break;
    }

    // Actualizar documento de la campaña
    await updateDoc(doc(db, 'campaigns', campaignId), updateFields);

    // Registro de Auditoría
    await addDoc(collection(db, 'medical_verification_log'), {
        campaignId,
        campaignTitle: campaignData.title ?? '',
        userId: userId || campaignData.userId || campaignData.organizer?.email || '',
        docType,
        action: (prevStatus === 'rejected' || prevStatus === 'more_info_required')
            ? 'resubmitted'
            : 'uploaded',
        statusBefore: prevStatus,
        statusAfter: 'under_review',
        documentUrl: downloadURL,
        timestamp: serverTimestamp(),
    } satisfies Omit<MedicalVerificationLog, 'id'>);

    return downloadURL;
};

// Wrapper para compatibilidad hacia atrás
export const uploadMedicalDocument = async (
    campaignId: string,
    file: File,
    userId: string
): Promise<string> => {
    return uploadVerificationDocument(campaignId, file, 'medical', userId);
};

// ─────────────────────────────────────────────────────────────
// ACTUALIZAR ESTADO DE DOCUMENTO ESPECÍFICO (admin)
// ─────────────────────────────────────────────────────────────
export const updateVerificationDocumentStatus = async (
    campaignId: string,
    docType: VerificationDocType,
    newStatus: MedicalDocumentStatus,
    adminId: string,
    adminNote: string
): Promise<void> => {
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) throw new Error('Campaign not found');

    const data = campaignSnap.data();
    let statusField = 'medicalDocumentStatus';
    let prevStatus: MedicalDocumentStatus = 'pending_upload';
    let docUrl = '';

    switch (docType) {
        case 'medical':
            statusField = 'medicalDocumentStatus';
            prevStatus = data.medicalDocumentStatus ?? 'pending_upload';
            docUrl = data.medicalDocumentUrl ?? '';
            break;
        case 'id_card':
            statusField = 'idDocumentStatus';
            prevStatus = data.idDocumentStatus ?? 'pending_upload';
            docUrl = data.idDocumentUrl ?? '';
            break;
        case 'bank_certificate':
            statusField = 'bankCertificateStatus';
            prevStatus = data.bankCertificateStatus ?? 'pending_upload';
            docUrl = data.bankCertificateUrl ?? '';
            break;
        case 'authorization_letter':
            statusField = 'authorizationLetterStatus';
            prevStatus = data.authorizationLetterStatus ?? 'pending_upload';
            docUrl = data.authorizationLetterUrl ?? '';
            break;
        default:
            statusField = 'medicalDocumentStatus';
            prevStatus = data.medicalDocumentStatus ?? 'pending_upload';
            docUrl = data.medicalDocumentUrl ?? '';
            break;
    }

    await updateDoc(campaignRef, {
        [statusField]: newStatus,
        [`${docType}AdminNote`]: adminNote,
        [`${docType}ReviewedBy`]: adminId,
        [`${docType}ReviewedAt`]: serverTimestamp(),
        // Mantener compatibilidad médica general
        ...(docType === 'medical' ? {
            medicalAdminNote: adminNote,
            medicalReviewedBy: adminId,
            medicalReviewedAt: serverTimestamp(),
        } : {})
    });

    await addDoc(collection(db, 'medical_verification_log'), {
        campaignId,
        campaignTitle: data.title ?? '',
        userId: data.userId || data.organizer?.email || '',
        adminId,
        docType,
        action: newStatus === 'approved'
            ? 'approved'
            : newStatus === 'rejected'
                ? 'rejected'
                : 'more_info_requested',
        statusBefore: prevStatus,
        statusAfter: newStatus,
        adminNote,
        documentUrl: docUrl,
        timestamp: serverTimestamp(),
    } satisfies Omit<MedicalVerificationLog, 'id'>);
};

// Wrapper para compatibilidad hacia atrás
export const updateMedicalDocumentStatus = async (
    campaignId: string,
    newStatus: MedicalDocumentStatus,
    adminId: string,
    adminNote: string
): Promise<void> => {
    return updateVerificationDocumentStatus(campaignId, 'medical', newStatus, adminId, adminNote);
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
// OBTENER CAMPAÑAS CON VERIFICACIÓN (para el panel admin)
// ─────────────────────────────────────────────────────────────
export const getAllMedicalCampaigns = async (): Promise<any[]> => {
    try {
        const q = query(
            collection(db, 'campaigns'),
            orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(c => isCampaignRequiringMedicalDoc(c) || c.medicalDocumentUrl || c.idDocumentUrl || c.bankCertificateUrl || c.authorizationLetterUrl);
    } catch (e) {
        // Fallback si el índice orderBy falla
        const snap = await getDocs(collection(db, 'campaigns'));
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(c => isCampaignRequiringMedicalDoc(c) || c.medicalDocumentUrl || c.idDocumentUrl || c.bankCertificateUrl || c.authorizationLetterUrl);
    }
};
