import { db } from '../firebase';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    runTransaction,
    increment
} from 'firebase/firestore';

export const getAllCampaigns = async () => {
    try {
        const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching all campaigns:", error);
        throw error;
    }
};

export const updateCampaignStatus = async (id: string, status: 'active' | 'hidden' | 'reported' | 'approved') => {
    try {
        const docRef = doc(db, "campaigns", id);
        await updateDoc(docRef, { status });
    } catch (error) {
        console.error("Error updating campaign status:", error);
        throw error;
    }
};

export const deleteCampaign = async (id: string) => {
    try {
        const docRef = doc(db, "campaigns", id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting campaign:", error);
        throw error;
    }
};

export const getAllDonations = async () => {
    try {
        const campaigns = await getAllCampaigns();
        let allDonations: any[] = [];

        for (const campaign of campaigns) {
            const donationsRef = collection(db, "campaigns", campaign.id, "donations");
            const snapshot = await getDocs(donationsRef);
            const campaignDonations = snapshot.docs.map(doc => ({
                id: doc.id,
                campaignTitle: (campaign as any).title,
                campaignId: campaign.id,
                ...doc.data()
            }));
            allDonations = [...allDonations, ...campaignDonations];
        }

        return allDonations.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    } catch (error) {
        console.error("Error fetching all donations:", error);
        throw error;
    }
};

export const getAllUsers = async () => {
    try {
        const snapshot = await getDocs(collection(db, "users"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
};

export const deleteUser = async (uid: string) => {
    try {
        const docRef = doc(db, "users", uid);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
};

export const updateDonation = async (campaignId: string, donationId: string, newAmount: number) => {
    try {
        await runTransaction(db, async (transaction) => {
            const donationRef = doc(db, "campaigns", campaignId, "donations", donationId);
            const campaignRef = doc(db, "campaigns", campaignId);

            const donationDoc = await transaction.get(donationRef);
            if (!donationDoc.exists()) throw "Donation not found";

            const oldAmount = donationDoc.data().amount || 0;
            const diff = newAmount - oldAmount;

            transaction.update(donationRef, { amount: newAmount });
            transaction.update(campaignRef, { currentAmount: increment(diff) });
        });
    } catch (error) {
        console.error("Error updating donation transaction:", error);
        throw error;
    }
};

export const deleteDonation = async (campaignId: string, donationId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const donationRef = doc(db, "campaigns", campaignId, "donations", donationId);
            const campaignRef = doc(db, "campaigns", campaignId);

            const donationDoc = await transaction.get(donationRef);
            if (!donationDoc.exists()) throw "Donation not found";

            const amount = donationDoc.data().amount || 0;

            transaction.delete(donationRef);
            transaction.update(campaignRef, {
                currentAmount: increment(-amount),
                donorCount: increment(-1)
            });
        });
    } catch (error) {
        console.error("Error deleting donation transaction:", error);
        throw error;
    }
};
