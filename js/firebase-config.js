// ===== FIREBASE CONFIG & INIT (Admin) =====
// PENTING: config ini SENGAJA identik dengan repository Store (Aliftzy-Store).
// Admin dan Store harus menunjuk ke Firebase project, Auth, dan Firestore
// yang SAMA agar semua perubahan dari Admin langsung terlihat di Store.
//
// apiKey di bawah ini MEMANG publik by design (bukan secret) — ini normal
// untuk semua Firebase Web App. Keamanan data dijaga oleh Firestore Security
// Rules (lihat firestore.rules), bukan dengan menyembunyikan config ini.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXiLMf3C6mqMTNfIWwMYRf9nTeYJjYx8E",
  authDomain: "aliftzy-store.firebaseapp.com",
  projectId: "aliftzy-store",
  storageBucket: "aliftzy-store.firebasestorage.app",
  messagingSenderId: "261265881032",
  appId: "1:261265881032:web:f8ca312b8f6e2c9c78f2fd",
  measurementId: "G-N09N17CCQF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
