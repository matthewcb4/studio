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
} from 'firebase/auth';

// Declare Capacitor global types
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins?: {
        Browser?: {
          open: (options: { url: string; presentationStyle?: string }) => Promise<void>;
        };
      };
    };
  }
}

// Helper to check if we're in Capacitor native environment using global object
function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.Capacitor?.isNativePlatform?.();
}

// Helper to open external browser using Capacitor global
async function openExternalBrowser(url: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // First try using Capacitor's Browser plugin via the global
    const Browser = window.Capacitor?.Plugins?.Browser;
    if (Browser?.open) {
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    }
  } catch (error) {
    console.warn('Capacitor Browser plugin not available:', error);
  }

  // Fallback: open in new window/tab
  window.open(url, '_blank');
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
  // Check if running in Capacitor native app using global object
  if (isCapacitorNative()) {
    // Open the main app URL in external browser where OAuth will work
    await openExternalBrowser('https://frepo.app/?native=true');
    throw new Error('BROWSER_AUTH_OPENED');
  }

  // Web fallback - use popup
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
}

/** Initiate Google sign-in but BLOCK new user creation (non-blocking). */
export async function initiateGoogleLogin(authInstance: Auth): Promise<any> {
  // Check if running in Capacitor native app using global object
  if (isCapacitorNative()) {
    await openExternalBrowser('https://frepo.app/?native=true');
    throw new Error('BROWSER_AUTH_OPENED');
  }

  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(authInstance, provider);
  const additionalUserInfo = getAdditionalUserInfo(result);

  if (additionalUserInfo?.isNewUser) {
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
