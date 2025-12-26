'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  linkWithPopup,
  signInWithPopup,
  sendEmailVerification,
  signOut,
  getAdditionalUserInfo,
  deleteUser,
  signInWithCredential,
} from 'firebase/auth';

// Capacitor Firebase Authentication types
interface CapacitorSignInResult {
  user?: {
    displayName?: string;
    email?: string;
    uid?: string;
  };
  credential?: {
    idToken?: string;
    accessToken?: string;
    providerId?: string;
  };
}

// Helper to check if we're in Capacitor native environment
async function isCapacitorNative(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Helper to get native Google sign-in result using Capacitor Firebase Auth
async function getNativeGoogleSignIn(): Promise<any> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  return FirebaseAuthentication.signInWithGoogle();
}

/** Initiate email/password sign-up (non-blocking). */
export async function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<any> {
  const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential;
}

/** Initiate email/password sign-in (non-blocking). */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<any> {
  const result = await signInWithEmailAndPassword(authInstance, email, password);

  // Allow test accounts to bypass email verification (for Play Store review)
  const isTestAccount = email.toLowerCase().includes('reviewer') ||
    email.toLowerCase().includes('test') ||
    email.toLowerCase().endsWith('@frepo.app');

  if (!result.user.emailVerified && !isTestAccount) {
    await signOut(authInstance);
    throw new Error("Please verify your email address before logging in.");
  }
  return result;
}

/** Initiate Google sign-in - uses native auth in Capacitor, popup on web */
export async function initiateGoogleSignIn(authInstance: Auth): Promise<any> {
  // Check if running in Capacitor native app
  if (await isCapacitorNative()) {
    // Use native Google Sign-In via Capacitor Firebase Auth
    const result = await getNativeGoogleSignIn();

    // Get the credential and sign in with Firebase
    if (result.credential?.idToken) {
      const credential = GoogleAuthProvider.credential(result.credential.idToken ?? null);
      return signInWithCredential(authInstance, credential);
    }

    throw new Error('Google Sign-In failed: No credential received');
  }

  // Web fallback - use popup
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
}

/** Initiate Google sign-in but BLOCK new user creation (non-blocking). */
export async function initiateGoogleLogin(authInstance: Auth): Promise<any> {
  let result;

  // Check if running in Capacitor native app
  if (await isCapacitorNative()) {
    // Use native Google Sign-In via Capacitor Firebase Auth
    const nativeResult = await getNativeGoogleSignIn();

    if (nativeResult.credential?.idToken) {
      const credential = GoogleAuthProvider.credential(nativeResult.credential.idToken ?? null);
      result = await signInWithCredential(authInstance, credential);
    } else {
      throw new Error('Google Sign-In failed: No credential received');
    }
  } else {
    // Web fallback - use popup
    const provider = new GoogleAuthProvider();
    result = await signInWithPopup(authInstance, provider);
  }

  const additionalUserInfo = getAdditionalUserInfo(result);

  if (additionalUserInfo?.isNewUser) {
    // If it's a new user, delete the account and throw an error
    await deleteUser(result.user);
    throw new Error("Account creation is not allowed here. Please use the mobile app or Sign Up page.");
  }

  return result;
}

/** Initiate Facebook sign-in with a popup (non-blocking). */
export function initiateFacebookSignIn(authInstance: Auth): Promise<any> {
  const provider = new FacebookAuthProvider();
  provider.addScope('email');
  return signInWithPopup(authInstance, provider);
}

/** Link the current user with a Facebook account. */
export async function linkFacebookAccount(authInstance: Auth): Promise<void> {
  if (!authInstance.currentUser) {
    throw new Error("No user is currently signed in.");
  }
  const provider = new FacebookAuthProvider();
  provider.addScope('email');
  await linkWithPopup(authInstance.currentUser, provider);
}
