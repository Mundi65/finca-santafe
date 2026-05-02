// ============================================================
// CONFIGURACIÓN FIREBASE - Finca SantaFe / DISTUCAR Cía. Ltda.
// ============================================================
// INSTRUCCIONES:
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto llamado "finca-santafe"
// 3. Habilita Authentication (Email/Password)
// 4. Habilita Firestore Database
// 5. Habilita Storage
// 6. En Configuración del proyecto > Tus apps > Web, copia tu config aquí
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDbi6l6egkEM-PiSl-D78Z_QDZEk5D-wOE",
  authDomain: "finca-santafe.firebaseapp.com",
  projectId: "finca-santafe",
  storageBucket: "finca-santafe.firebasestorage.app",
  messagingSenderId: "659720587208",
  appId: "1:659720587208:web:bce17f33edcb1c827162fd",
  measurementId: "G-XZVERRQXHC"
};

// ============================================================
// REGLAS FIRESTORE RECOMENDADAS (pegar en Firebase Console):
// ============================================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function getUserLevel() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.nivel;
    }
    function isAdmin() {
      return isAuthenticated() && getUserLevel() <= 1;
    }
    function isOwner() {
      return isAuthenticated() && getUserLevel() == 0;
    }

    match /usuarios/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner() || request.auth.uid == userId;
    }
    match /gastos/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 2;
      allow delete: if isAdmin();
    }
    match /ingresos/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 2;
      allow delete: if isAdmin();
    }
    match /ganado/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 2;
      allow delete: if isAdmin();
    }
    match /camadas/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 2;
      allow delete: if isAdmin();
    }
    match /agricola/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 2;
      allow delete: if isAdmin();
    }
    match /tareas/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 2;
    }
    match /contactos/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 1;
    }
    match /eventos/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserLevel() <= 2;
    }
  }
}
*/

// ============================================================
// REGLAS STORAGE RECOMENDADAS (pegar en Firebase Console):
// ============================================================
/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /facturas/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /ganado/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /avatars/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/
