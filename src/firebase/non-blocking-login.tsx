'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
  FacebookAuthProvider,
  linkWithPopup,
  signInWithPopup,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): Promise<any> {
  return signInAnonymously(authInstance);
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<any> {
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<any> {
  return signInWithEmailAndPassword(authInstance, email, password);
}

/** Initiate Google sign-in with a redirect (non-blocking). */
export function initiateGoogleSignIn(authInstance: Auth): Promise<any> {
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(authInstance, provider);
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
  // We use linkWithPopup here as it provides a better UX for account linking.
  await linkWithPopup(authInstance.currentUser, provider);
}
