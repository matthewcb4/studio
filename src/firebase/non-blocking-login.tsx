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
  getRedirectResult,
} from 'firebase/auth';

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

// Helper to open external browser for auth
async function openExternalBrowser(url: string): Promise<void> {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (error) {
    console.error('Failed to open browser:', error);
    window.open(url, '_blank');
  }
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
  if (!result.user.emailVerified) {
    await signOut(authInstance);
    throw new Error("Please verify your email address before logging in.");
  }
  return result;
}

/** Initiate Google sign-in - opens external browser in Capacitor, popup on web */
export async function initiateGoogleSignIn(authInstance: Auth): Promise<any> {
  // Check if running in Capacitor native app
  if (await isCapacitorNative()) {
    // Open the main app URL in external browser where OAuth will work
    // User will sign in there, then return to the app
    await openExternalBrowser('https://frepo.app/?native=true');
    // Return a message indicating the user should sign in via browser
    throw new Error('BROWSER_AUTH_OPENED');
  }

  // Web fallback - use popup
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
}

/** Initiate Google sign-in but BLOCK new user creation (non-blocking). */
export async function initiateGoogleLogin(authInstance: Auth): Promise<any> {
  // Check if running in Capacitor native app
  if (await isCapacitorNative()) {
    // Open the main app URL in external browser where OAuth will work
    await openExternalBrowser('https://frepo.app/?native=true');
    throw new Error('BROWSER_AUTH_OPENED');
  }

  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(authInstance, provider);
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
