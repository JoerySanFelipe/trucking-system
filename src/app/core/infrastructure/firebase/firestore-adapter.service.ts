import { Injectable, inject } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  DocumentData, 
  Unsubscribe 
} from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreAdapterService {
  private firebaseService = inject(FirebaseService);

  get db() {
    return this.firebaseService.db;
  }

  /**
   * Listens in real-time to a Firestore collection
   */
  observeCollection<T extends { id: string }>(
    collectionName: string,
    onData: (items: T[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.db, collectionName);
    return onSnapshot(
      colRef,
      snapshot => {
        const items = snapshot.docs.map(d => ({
          ...d.data(),
          id: d.id
        })) as T[];
        onData(items);
      },
      err => {
        console.warn(`[FirestoreAdapter] Live subscription error on '${collectionName}':`, err.message);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Fetches all documents from a collection once
   */
  async getCollection<T extends { id: string }>(collectionName: string): Promise<T[]> {
    try {
      const colRef = collection(this.db, collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id
      })) as T[];
    } catch (err: any) {
      console.warn(`[FirestoreAdapter] Failed to fetch '${collectionName}':`, err.message);
      return [];
    }
  }

  /**
   * Sets or overwrites a document with explicit ID, sanitizing undefined fields
   */
  async saveDocument<T extends DocumentData>(collectionName: string, docId: string, data: T): Promise<void> {
    try {
      const sanitized = this.cleanForFirestore(data);
      const docRef = doc(this.db, collectionName, docId);
      await setDoc(docRef, sanitized, { merge: true });
      console.log(`[FirestoreAdapter] Saved '${collectionName}/${docId}' to Cloud Firestore.`);
    } catch (err: any) {
      console.error(`[FirestoreAdapter] Error saving '${collectionName}/${docId}':`, err);
    }
  }

  /**
   * Updates specific fields of an existing document, sanitizing undefined fields
   */
  async updateDocument(collectionName: string, docId: string, partialData: Partial<DocumentData>): Promise<void> {
    try {
      const sanitized = this.cleanForFirestore(partialData);
      const docRef = doc(this.db, collectionName, docId);
      await updateDoc(docRef, sanitized);
      console.log(`[FirestoreAdapter] Updated '${collectionName}/${docId}' in Cloud Firestore.`);
    } catch (err: any) {
      console.error(`[FirestoreAdapter] Error updating '${collectionName}/${docId}':`, err);
    }
  }

  /**
   * Deletes a document
   */
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      await deleteDoc(docRef);
      console.log(`[FirestoreAdapter] Deleted '${collectionName}/${docId}' from Cloud Firestore.`);
    } catch (err: any) {
      console.error(`[FirestoreAdapter] Error deleting '${collectionName}/${docId}':`, err);
    }
  }

  /**
   * Recursively strips undefined values so Cloud Firestore never throws "Unsupported field value: undefined"
   */
  private cleanForFirestore(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj
        .filter(item => item !== undefined)
        .map(item => this.cleanForFirestore(item));
    }
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = this.cleanForFirestore(val);
      }
    }
    return cleaned;
  }
}
