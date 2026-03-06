import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { useAuth } from '@/context/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [supported] = useState(
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  );

  // Check existing subscription on mount
  useEffect(() => {
    if (!supported || !user) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      });
    });
  }, [supported, user]);

  const subscribe = useCallback(async () => {
    setError(null);

    if (!supported) {
      setError('Push notifications are not supported in this browser.');
      return null;
    }
    if (!user) {
      setError('You must be logged in to enable push notifications.');
      return null;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError('Push notifications are not configured. Contact support.');
      console.error('VITE_VAPID_PUBLIC_KEY is not set');
      return null;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'denied') {
        setError('Notification permission was denied. Check your browser settings.');
        return null;
      }
      if (perm !== 'granted') {
        setError('Notification permission is required to enable push notifications.');
        return null;
      }

      // SW is registered by VitePWA — just wait for it to be ready
      const registration = await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Store subscription in push_subscriptions table
      const { error: dbError } = await supabase.from(TABLES.PUSH_SUBSCRIPTIONS).upsert(
        {
          user_id: user.id,
          subscription: sub.toJSON(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (dbError) throw dbError;

      setSubscription(sub);
      return sub;
    } catch (err) {
      console.error('Push subscription failed:', err);
      setError(err.message || 'Failed to enable push notifications.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  const unsubscribe = useCallback(async () => {
    if (!subscription || !user) return;

    setLoading(true);
    try {
      await subscription.unsubscribe();

      await supabase
        .from(TABLES.PUSH_SUBSCRIPTIONS)
        .delete()
        .eq('user_id', user.id);

      setSubscription(null);
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [subscription, user]);

  return {
    supported,
    permission,
    subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
    isSubscribed: !!subscription,
  };
}
