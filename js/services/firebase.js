/**
 * Firebase Firestore ve Cloud Entegrasyonu
 * Tüm cihazlar arası canlı kullanıcı kaydı, arkadaşlık ve düello sinyalleşmesi.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import { APP_CONFIG } from '../config.js';

let db = null;
let isFirebaseActive = false;

try {
  if (APP_CONFIG.firebase && APP_CONFIG.firebase.apiKey) {
    const app = initializeApp(APP_CONFIG.firebase);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log('🔥 Firebase Cloud Firestore başarıyla başlatıldı!');
  }
} catch (err) {
  console.warn('Firebase başlatılamadı, yerel mod kullanılacak:', err);
  isFirebaseActive = false;
}

export { 
  db, 
  isFirebaseActive, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
};
