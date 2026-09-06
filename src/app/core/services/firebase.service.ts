import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, uploadString, getBytes, getDownloadURL } from 'firebase/storage';
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

  // Upload Generic Proof/Receipt Image to Firebase Storage
  async uploadProofFile(file: File, folder: string = 'proofs'): Promise<string> {
    const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'png';
    const storageRef = ref(this.storage, `${folder}/proof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  }

  // Upload Base64 Data URL to Firebase Storage (returns permanent Google Cloud URL)
  async uploadBase64Image(dataUrl: string, folder: string = 'proofs'): Promise<string> {
    const ext = dataUrl.includes('image/jpeg') ? 'jpg' : (dataUrl.includes('image/webp') ? 'webp' : 'png');
    const storageRef = ref(this.storage, `${folder}/proof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`);
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(snapshot.ref);
  }

  // Convert Firebase Storage URL or remote/data URL to Base64 Data URL (bypassing browser CORS via getBytes)
  async getImageAsDataUrl(url: string): Promise<string | null> {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:image/')) return url;
    try {
      if (url.includes('firebasestorage.googleapis.com') || url.startsWith('gs://')) {
        try {
          const storageRef = ref(this.storage, url);
          const buffer = await getBytes(storageRef);
          const mime = url.includes('.jpg') || url.includes('.jpeg') ? 'image/jpeg' : 'image/png';
          if (typeof FileReader !== 'undefined') {
            const blob = new Blob([buffer], { type: mime });
            return await new Promise<string | null>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } else {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return `data:${mime};base64,${btoa(binary)}`;
          }
        } catch (storageErr) {
          console.warn('Firebase Storage getBytes blocked by CORS or unavailable:', storageErr);
        }
      }
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Failed to load image as data URL:', e);
      return null;
    }
  }
}
