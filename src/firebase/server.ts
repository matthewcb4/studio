/**
 * Server-side Firebase configuration for SSR pages like Blog
 * Uses firebase-admin for server-side operations
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;

function getAdminApp(): App {
    if (adminApp) return adminApp;

    if (getApps().length === 0) {
        // In Firebase App Hosting, credentials are automatically provided
        // For local development, use GOOGLE_APPLICATION_CREDENTIALS env var
        try {
            adminApp = initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-8653444803-84660',
            });
        } catch (e) {
            console.error('Failed to initialize Firebase Admin:', e);
            throw e;
        }
    } else {
        adminApp = getApps()[0];
    }

    return adminApp;
}

export function getServerFirestore(): Firestore {
    if (adminDb) return adminDb;
    adminDb = getFirestore(getAdminApp());
    return adminDb;
}
