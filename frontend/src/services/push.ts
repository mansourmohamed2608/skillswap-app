// src/services/push.ts
// Web push token registration using Firebase Cloud Messaging.
// - Requests Notification permission
// - Registers firebase-messaging-sw.js service worker for background notifications
// - Retrieves an FCM token using a VAPID key
// - Sends the token to the backend /user/devices/register with Firebase ID token auth

import { getApps, getApp, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, Messaging, onMessage } from 'firebase/messaging';
import { auth, firebaseConfig } from '@/services/firebase';

function getOrInitApp() {
  try { return getApps().length ? getApp() : initializeApp(firebaseConfig); } catch { return undefined; }
}

/**
 * Register the Firebase messaging service worker
 * This SW handles background push notifications
 */
async function registerMessagingSW(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  
  try {
    // Always use the dedicated Firebase messaging service worker for FCM
    // This ensures background messages are handled correctly
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    });
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (error) {
    console.warn('Failed to register firebase-messaging-sw.js:', error);
    
    // Fallback: try to use any existing service worker
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) return existing;
    } catch {
      // Ignore
    }
    
    return undefined;
  }
}

/**
 * Set up foreground message handler
 * Shows notifications when app is in foreground
 */
export function setupForegroundMessageHandler(messaging: Messaging): void {
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    // Show notification if we have permission and the browser supports it
    if (Notification.permission === 'granted' && payload.notification) {
      const { title, body } = payload.notification;
      new Notification(title || 'SkillSwap', {
        body: body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: payload.data,
      });
    }
  });
}

export async function ensurePushRegistered(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    if (!('Notification' in window)) return null;

    // Request permission
    const perm = await (async () => {
      if (Notification.permission === 'default') {
        return await Notification.requestPermission();
      }
      return Notification.permission;
    })();
    if (perm !== 'granted') return null;

    // Check FCM support
    if (!(await isSupported())) return null;

    // Initialize Firebase app
    const app = getOrInitApp();
    if (!app) return null;
    
    let messaging: Messaging;
    try { 
      messaging = getMessaging(app);
      // Set up foreground handler
      setupForegroundMessageHandler(messaging);
    } catch { 
      return null; 
    }

    // Get VAPID key from environment
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY not configured');
      return null;
    }

    // Register service worker and get token
    const swReg = await registerMessagingSW();
    const token = await getToken(messaging, { 
      vapidKey, 
      serviceWorkerRegistration: swReg 
    });
    
    if (!token) {
      console.warn('Failed to get FCM token');
      return null;
    }

    // Send token to backend
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      console.log('User not signed in, will register token later');
      return token; // Return token but don't send to backend yet
    }
    
    const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
    const response = await fetch(`${base}/user/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      console.warn('Failed to register device token with backend:', response.status);
    }
    
    return token;
  } catch (e) {
    console.warn('Push registration failed', e);
    return null;
  }
}
