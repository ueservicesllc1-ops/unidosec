import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { canWithdraw, isCampaignRequiringMedicalDoc } from './medicalVerificationService';

export interface WithdrawalRequest {
    id?: string;
    userId?: string;
    campaignId: string;
    campaignTitle: string;
    organizerEmail: string;
    firstName: string;
    lastName: string;
    idNumber: string; // Cedula
    phone: string;
    email: string;
    address: string;
    ruc: string;
    bankAccountNumber: string;
    bankName: string;
    accountType: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    amountRequested: number;
    createdAt: any;
}

export const createWithdrawalRequest = async (request: Omit<WithdrawalRequest, 'id' | 'createdAt' | 'status'>) => {
    try {
        // ── MOTOR DE AUTORIZACIÓN (capa JavaScript) ──────────────────
        // La segunda barrera está en Firestore Security Rules (servidor)
        const campaignSnap = await getDoc(doc(db, 'campaigns', request.campaignId));
        if (!campaignSnap.exists()) {
            throw { code: 'WITHDRAWAL_BLOCKED', reasons: ['CAMPAIGN_NOT_FOUND'] };
        }
        const campaign = { id: campaignSnap.id, ...campaignSnap.data() };
        const auth = canWithdraw(campaign);
        if (!auth.allowed) {
            throw { code: 'WITHDRAWAL_BLOCKED', reasons: auth.blockedBy };
        }
        // ─────────────────────────────────────────────────────────────

        const docRef = await addDoc(collection(db, "withdrawal_requests"), {
            ...request,
            status: 'pending',
            createdAt: serverTimestamp(),
            // Snapshot del estado de autorización al momento de la solicitud
            authorizationChecks: {
                goalReached: (campaign as any).currentAmount > 0,
                medicalVerified: (campaign as any).medicalDocumentStatus === 'approved' || !isCampaignRequiringMedicalDoc(campaign),
            },
        });
        return docRef.id;
    } catch (error: any) {
        if (error?.code === 'WITHDRAWAL_BLOCKED') throw error;
        console.error("Error creating withdrawal request:", error);
        throw error;
    }
};

export const getAllWithdrawalRequests = async () => {
    try {
        const q = query(collection(db, "withdrawal_requests"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithdrawalRequest[];
    } catch (error) {
        console.error("Error fetching withdrawal requests:", error);
        throw error;
    }
};

export const updateWithdrawalStatus = async (id: string, status: WithdrawalRequest['status']) => {
    try {
        const ref = doc(db, "withdrawal_requests", id);
        await updateDoc(ref, { status, updatedAt: serverTimestamp() });
    } catch (error) {
        console.error("Error updating withdrawal status:", error);
        throw error;
    }
};
