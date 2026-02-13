import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';

export interface WithdrawalRequest {
    id?: string;
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
        const docRef = await addDoc(collection(db, "withdrawal_requests"), {
            ...request,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
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
