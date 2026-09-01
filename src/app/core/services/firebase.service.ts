import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  private app: FirebaseApp;
  public db: Firestore;
  public storage: FirebaseStorage;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.db = getFirestore(this.app);
    this.storage = getStorage(this.app);
  }

  // Firestore Helper: Fetch dispatches collection
  async getCollection<T>(collectionName: string): Promise<T[]> {
    try {
      const colRef = collection(this.db, collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    } catch (error) {
      console.warn(`Firestore collection ${collectionName} read error or unconfigured:`, error);
      return [];
    }
  }

  // Upload POD Image to Firebase Storage
  async uploadPODImage(file: File, tloNumber: string): Promise<string> {
    const storageRef = ref(this.storage, `pods/TLO_${tloNumber}_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  }
}
