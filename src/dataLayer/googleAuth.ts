import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

export const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

// Initialize Firebase App
function initFirebase() {
  if (getApps().length > 0) {
    return getApp();
  }

  // Load config from firebase-applet-config.json
  const config = {
    apiKey: "AIzaSyC9KH4JuOllS6IdZIZyr7KObQFccS2mcdw",
    authDomain: "gen-lang-client-0966306155.firebaseapp.com",
    projectId: "gen-lang-client-0966306155",
    storageBucket: "gen-lang-client-0966306155.firebasestorage.app",
    messagingSenderId: "775675647394",
    appId: "1:775675647394:web:87e5ebc0f4e79351ff4efb",
  };

  return initializeApp(config);
}

export function getFirebaseAuth() {
  const app = initFirebase();
  return getAuth(app);
}

export function getCachedToken(): string | null {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }
  return null;
}

export function setCachedToken(token: string, expiresInSeconds: number = 3600) {
  cachedAccessToken = token;
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
}

export function clearCachedToken() {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
}

export async function signInWithGoogleOAuth(): Promise<{ user: User; accessToken: string }> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();

  SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: "consent",
    access_type: "offline",
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error("لم يتم الحصول على تصريح الوصول (OAuth Access Token) من Google");
  }

  setCachedToken(accessToken);
  return { user: result.user, accessToken };
}

export async function signOutGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  clearCachedToken();
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}
