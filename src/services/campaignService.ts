import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, DocumentReference, doc, updateDoc, increment, getDoc, query, orderBy, limit, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface CampaignData {
    title: string;
    category: string;
    goal: number;
    description: string;
    beneficiary: string;
    organizer: {
        name: string;
        email: string;
        phone: string;
        city: string;
        address: string;
    };
    imageUrl?: string;
    videoUrl?: string;
    additionalImages?: string[];
    createdAt?: any;
}

export interface Donation {
    id: string;
    amount: number;
    donorName: string;
    isAnonymous: boolean;
    createdAt: any; // Firestore Timestamp
}

export const uploadImage = async (file: File): Promise<string> => {
    try {
        const cleanFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storageRef = ref(storage, `campaigns/${Date.now()}_${cleanFileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image: ", error);
        throw error;
    }
};

export const createCampaign = async (data: CampaignData): Promise<string> => {
    try {
        const docRef: DocumentReference = await addDoc(collection(db, "campaigns"), {
            ...data,
            createdAt: serverTimestamp(),
            currentAmount: 0,
            donorCount: 0,
            status: 'active'
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding document: ", error);
        throw error;
    }
};

export const addDonation = async (campaignId: string, amount: number, donorName: string, isAnonymous: boolean): Promise<void> => {
    try {
        // 1. Add donation to subcollection
        const donationsRef = collection(db, "campaigns", campaignId, "donations");
        await addDoc(donationsRef, {
            amount: amount,
            donorName: isAnonymous ? "Anónimo" : donorName,
            isAnonymous: isAnonymous,
            createdAt: serverTimestamp(),
        });

        // 2. Update campaign totals
        const campaignRef = doc(db, "campaigns", campaignId);
        await updateDoc(campaignRef, {
            currentAmount: increment(amount),
            donorCount: increment(1)
        });

    } catch (error) {
        console.error("Error adding donation: ", error);
        throw error;
    }
};

export const getRecentDonations = async (campaignId: string): Promise<Donation[]> => {
    try {
        const donationsRef = collection(db, "campaigns", campaignId, "donations");
        const q = query(donationsRef, orderBy("createdAt", "desc"), limit(5));
        const querySnapshot = await getDocs(q);

        const donations: Donation[] = [];
        querySnapshot.forEach((doc) => {
            donations.push({ id: doc.id, ...doc.data() } as Donation);
        });

        return donations;
    } catch (error) {
        console.error("Error getting donations: ", error);
        return [];
    }
};

/**
 * Toggles a like on a campaign for a given user.
 * Uses arrayUnion/arrayRemove so each user can only like once.
 */
export const toggleCampaignLike = async (campaignId: string, userId: string, hasLiked: boolean): Promise<void> => {
    const campaignRef = doc(db, 'campaigns', campaignId);
    if (hasLiked) {
        // Remove like
        await updateDoc(campaignRef, {
            likedBy: arrayRemove(userId),
            likesCount: increment(-1)
        });
    } else {
        // Add like
        await updateDoc(campaignRef, {
            likedBy: arrayUnion(userId),
            likesCount: increment(1)
        });
    }
};

export const getCampaign = async (id: string): Promise<CampaignData | null> => {
    try {
        const docRef = doc(db, "campaigns", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as CampaignData;
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error getting document:", error);
        throw error;
    }
};
