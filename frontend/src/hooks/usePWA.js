/**
 * BARBER HUB — PWA Hook
 * Handles: beforeinstallprompt capture, installation state, update prompt, push subscription.
 */
import { useEffect, useState, useCallback } from 'react';

const DEFERRED_KEY = '__bh_deferred_prompt__';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Detect platform & installation state
  useEffect(() => {
    const ua = window.navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(iOS);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    setIsInstalled(standalone);
  }, []);

  // Capture beforeinstallprompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window[DEFERRED_KEY] = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If already fired before this effect ran
    if (window[DEFERRED_KEY]) {
      setDeferredPrompt(window[DEFERRED_KEY]);
      setCanInstall(true);
    }

    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      try { localStorage.setItem('__bh_pwa_installed__', '1'); } catch {}
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Only register in production-like environments (works on https / localhost)
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        setSwRegistration(reg);

        // Listen for update
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        // Check for updates periodically
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      } catch (err) {
        console.warn('[PWA] SW registration failed:', err);
      }
    };
    // Register after load to avoid slowing first paint
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  const promptInstall = useCallback(async () => {
    const p = deferredPrompt || window[DEFERRED_KEY];
    if (!p) return { outcome: 'unavailable' };
    try {
      p.prompt();
      const choice = await p.userChoice;
      setDeferredPrompt(null);
      window[DEFERRED_KEY] = null;
      setCanInstall(false);
      return choice; // { outcome: 'accepted' | 'dismissed', platform }
    } catch (e) {
      return { outcome: 'error', error: e };
    }
  }, [deferredPrompt]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') {
      setNotifPermission('granted');
      return 'granted';
    }
    try {
      const p = await Notification.requestPermission();
      setNotifPermission(p);
      return p;
    } catch {
      return 'denied';
    }
  }, []);

  const showLocalNotification = useCallback((title, options = {}) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    try {
      if (swRegistration && swRegistration.showNotification) {
        swRegistration.showNotification(title, {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-96.png',
          vibrate: [200, 100, 200],
          ...options,
        });
      } else {
        new Notification(title, { icon: '/icons/icon-192.png', ...options });
      }
      return true;
    } catch {
      return false;
    }
  }, [swRegistration]);

  const applyUpdate = useCallback(() => {
    if (!swRegistration || !swRegistration.waiting) return;
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }, [swRegistration]);

  return {
    canInstall,
    isInstalled,
    isIOS,
    isStandalone,
    promptInstall,
    notifPermission,
    requestNotificationPermission,
    showLocalNotification,
    swRegistration,
    updateAvailable,
    applyUpdate,
  };
}

export default usePWA;
