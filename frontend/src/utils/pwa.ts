/**
 * PWA helpers — service worker + notifications
 */

const SW_MIGRATE_KEY = 'onchess-sw-migrate';
const SW_MIGRATE_VERSION = '4';

export async function purgePwaCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers are not supported');
    return null;
  }

  try {
    const migrated = localStorage.getItem(SW_MIGRATE_KEY) === SW_MIGRATE_VERSION;
    if (!migrated) {
      await purgePwaCaches();
      localStorage.setItem(SW_MIGRATE_KEY, SW_MIGRATE_VERSION);
    }

    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered successfully', registration);

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          installing.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    setInterval(async () => {
      try {
        if (registration.active || registration.waiting || registration.installing) {
          await registration.update();
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('MIME type')) {
          console.debug('[PWA] Update check skipped:', message);
        }
      }
    }, 60000);

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

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

export async function sendNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (Notification.permission !== 'granted') {
    console.log('[PWA] Notification permission not granted');
    return;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      options,
    });
  } else {
    new Notification(title, {
      icon: '/icons/favicon-192x192.png',
      badge: '/icons/favicon-192x192.png',
      ...options,
    });
  }
}

export function isPWAInstalled(): boolean {
  const isStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  return isStandalone;
}

export function setupInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    callback(true);
  };

  const handleAppInstalled = () => {
    console.log('[PWA] App installed');
    callback(false);
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}

export async function promptInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      const promptEvent = e as Event & {
        prompt: () => void;
        userChoice: Promise<{ outcome: string }>;
      };
      promptEvent.prompt();
      promptEvent.userChoice.then((choiceResult) => {
        resolve(choiceResult.outcome === 'accepted');
        window.removeEventListener('beforeinstallprompt', handler);
      });
    };

    window.addEventListener('beforeinstallprompt', handler);
  });
}
