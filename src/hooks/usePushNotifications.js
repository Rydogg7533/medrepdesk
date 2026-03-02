import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
    if (!supported || !user || !VAPID_PUBLIC_KEY) return null;

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') return null;

      // Register the custom push SW
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Store subscription in push_subscriptions table
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          subscription: sub.toJSON(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;

      setSubscription(sub);
      return sub;
    } catch (err) {
      console.error('Push subscription failed:', err);
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
        .from('push_subscriptions')
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
    subscribe,
    unsubscribe,
    isSubscribed: !!subscription,
  };
}
