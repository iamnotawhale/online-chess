/**
 * Register PWA service worker
 * Enables offline support, caching, and push notifications
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      {
        scope: '/',
      }
    );

    console.log('[PWA] Service Worker registered successfully', registration);

    // Check for updates periodically
    setInterval(async () => {
      try {
        await registration.update();
      } catch (error) {
        console.error('[PWA] Failed to check for updates:', error);
      }
    }, 60000); // Check every 60 seconds

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Request permission for push notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications are not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[PWA] Notification permission:', permission);
  return permission;
}

/**
 * Send a local notification
 */
export async function sendNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (Notification.permission !== 'granted') {
    console.log('[PWA] Notification permission not granted');
    return;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Use service worker to show notification (more reliable)
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      options,
    });
  } else {
    // Fallback to direct notification
    new Notification(title, {
      icon: '/icons/favicon-192x192.png',
      badge: '/icons/favicon-192x192.png',
      ...options,
    });
  }
}

/**
 * Check if PWA is installed (launched as standalone)
 */
export function isPWAInstalled(): boolean {
  // Check if running in standalone mode (PWA installed)
  const isStandalone =
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  return isStandalone;
}

/**
 * Check if the "install" prompt can be shown
 * Use this in your app to show a custom install button
 */
export function setupInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  // @ts-expect-error - deferredPrompt is used in the event handlers through closure
  let deferredPrompt: any;

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    callback(true);
  };

  const handleAppInstalled = () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    callback(false);
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}

export async function promptInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      (e as any).prompt();
      (e as any).userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted install');
          resolve(true);
        } else {
          console.log('[PWA] User declined install');
          resolve(false);
        }
        window.removeEventListener('beforeinstallprompt', handler);
      });
    };

    window.addEventListener('beforeinstallprompt', handler);
  });
}
