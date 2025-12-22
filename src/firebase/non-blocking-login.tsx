'use client';
import {
  Auth, // Import Auth type for type hinting
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
  FacebookAuthProvider,
  linkWithPopup,
  signInWithPopup,
  sendEmailVerification,
  signOut,
  getAdditionalUserInfo,
  deleteUser,
  signInWithCredential,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

/** Initiate email/password sign-up (non-blocking). */
export async function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<any> {
  const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential;
}

/** Initiate email/password sign-in (non-blocking). */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<any> {
  const result = await signInWithEmailAndPassword(authInstance, email, password);
  if (!result.user.emailVerified) {
    await signOut(authInstance);
    throw new Error("Please verify your email address before logging in.");
  }
  return result;
}

/** Initiate Google sign-in - uses native auth in Capacitor, popup on web */
export async function initiateGoogleSignIn(authInstance: Auth): Promise<any> {
  // Check if running in Capacitor native app
  if (Capacitor.isNativePlatform()) {
    // Use native Google Sign-In
    const result = await FirebaseAuthentication.signInWithGoogle();

    // Get the credential and sign in with Firebase
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    return signInWithCredential(authInstance, credential);
  }

  // Web fallback - use popup
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
}

/** Initiate Google sign-in but BLOCK new user creation (non-blocking). */
export async function initiateGoogleLogin(authInstance: Auth): Promise<any> {
  let result;

  // Check if running in Capacitor native app
  if (Capacitor.isNativePlatform()) {
    // Use native Google Sign-In
    const nativeResult = await FirebaseAuthentication.signInWithGoogle();
    const credential = GoogleAuthProvider.credential(nativeResult.credential?.idToken);
    result = await signInWithCredential(authInstance, credential);
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
  // We use linkWithPopup here as it provides a better UX for account linking.
  await linkWithPopup(authInstance.currentUser, provider);
}
