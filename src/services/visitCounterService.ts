import { db } from '../firebase';
import {
    doc,
    setDoc,
    increment,
    onSnapshot,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

const COUNTER_DOC = doc(db, 'analytics', 'visits');

/**
 * Increments the total visit counter by 1 in Firestore.
 * Uses sessionStorage to avoid counting the same session multiple times.
 */
export async function incrementVisitCount(): Promise<void> {
    const alreadyCounted = sessionStorage.getItem('visit_counted');
    if (alreadyCounted) return;

    try {
        await setDoc(
            COUNTER_DOC,
            { totalVisits: increment(1) },
            { merge: true }
        );
        sessionStorage.setItem('visit_counted', 'true');
    } catch (error) {
        console.error('Error incrementing visit count:', error);
    }
}

/**
 * Subscribes to real-time updates of the total visit count.
 * Returns an unsubscribe function.
 */
export function subscribeToVisitCount(
    callback: (count: number) => void
): Unsubscribe {
    return onSnapshot(COUNTER_DOC, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            callback(data.totalVisits ?? 0);
        } else {
            callback(0);
        }
    });
}
