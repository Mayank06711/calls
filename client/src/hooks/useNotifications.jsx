import React, { useState, useCallback, useMemo, useContext, createContext, useEffect, useRef } from 'react';
import { mockNotifications } from '../Components/Home/Hearders/Notifications/mockNotifications';
import { useSocketContext } from '../socket/SocketContext';
import { listenEvent, emitEvent } from '../socket/socketUtils';
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '../utils/notificationSound';

const CATEGORIES = ['all', 'suggestion', 'social', 'promotion', 'system', 'wardrobe'];
const DISMISS_FLUSH_DELAY = 2000; // 2s debounce window for batching dismisses

const NotificationContext = createContext(null);

// Normalize server notification shape to match client card components
function formatNotification(serverNotif) {
  return {
    id: serverNotif.id || serverNotif._id || String(Date.now() + Math.random()),
    type: serverNotif.type || serverNotif.eventType || 'system',
    title: serverNotif.title || '',
    message: serverNotif.message || serverNotif.text || '',
    read: serverNotif.read || false,
    createdAt: serverNotif.createdAt || new Date().toISOString(),
    product: serverNotif.product,
    action: serverNotif.action,
    user: serverNotif.user,
    content: serverNotif.content,
    discount: serverNotif.discount,
    expiresIn: serverNotif.expiresIn,
    description: serverNotif.description,
    severity: serverNotif.severity,
    extLink: serverNotif.extLink,
    stickyTime: serverNotif.stickyTime,
    wardrobe: serverNotif.wardrobe,
  };
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const { socket, isAuthenticated } = useSocketContext();
  const fetchedRef = useRef(false);

  // ── Debounced dismiss queue ──
  const dismissQueueRef = useRef(new Set());
  const dismissTimerRef = useRef(null);
  const socketRef = useRef(socket);
  socketRef.current = socket;

  const flushDismissQueue = useCallback(() => {
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;

    const ids = Array.from(dismissQueueRef.current);
    dismissQueueRef.current.clear();

    if (ids.length === 0) return;

    const sock = socketRef.current;
    if (sock?.connected) {
      emitEvent(sock, {
        event: 'notification:dismiss-batch',
        data: { notificationIds: ids },
      }).catch(() => {});
    }
  }, []);

  // Flush on unmount or page close so nothing is lost
  useEffect(() => {
    const handleBeforeUnload = () => flushDismissQueue();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushDismissQueue();
    };
  }, [flushDismissQueue]);

  // Request browser notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Fetch notification history when socket is authenticated
  useEffect(() => {
    if (!isAuthenticated || !socket?.connected || fetchedRef.current) return;

    fetchedRef.current = true;

    emitEvent(socket, {
      event: 'notification:history',
      data: { limit: 100, skip: 0 },
      timeout: 10000,
      handlers: {
        onSuccess: (response) => {
          if (response?.status === 'success' && Array.isArray(response.notifications)) {
            const formatted = response.notifications.map(formatNotification);
            setNotifications(formatted);
            setIsLoaded(true);
          }
        },
        onError: () => {
          if (!isLoaded) setIsLoaded(true);
        },
      },
      validateResponse: (r) => r?.status === 'success',
    }).catch(() => {
      if (!isLoaded) setIsLoaded(true);
    });
  }, [isAuthenticated, socket]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !socket) return;

    const cleanupNew = listenEvent(socket, {
      event: 'notification:new',
      handler: (payload) => {
        const data = payload?.data || payload;
        const notification = formatNotification(data);
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
        playNotificationSound();
        showBrowserNotification(notification.title || 'New Notification', {
          body: notification.message,
          tag: `notif-${notification.id}`,
          url: '/notifications',
        });
      },
    });

    const cleanupBatch = listenEvent(socket, {
      event: 'notification:batch',
      handler: (payload) => {
        const data = payload?.data || payload;
        if (data?.notifications && Array.isArray(data.notifications)) {
          const formatted = data.notifications.map(formatNotification);
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newOnes = formatted.filter((n) => !existingIds.has(n.id));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev];
          });
          if (data.notifications.length > 0) {
            playNotificationSound();
          }
        }
      },
    });

    return () => {
      cleanupNew();
      cleanupBatch();
    };
  }, [isAuthenticated, socket]);

  // Reset fetch flag on disconnect so we refetch on reconnect
  useEffect(() => {
    if (!isAuthenticated) {
      fetchedRef.current = false;
    }
  }, [isAuthenticated]);

  // ── Dismiss: remove from UI instantly, queue ID, flush after debounce ──
  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    dismissQueueRef.current.add(id);
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(flushDismissQueue, DISMISS_FLUSH_DELAY);
  }, [flushDismissQueue]);

  // ── Clear all: remove from UI, flush all IDs immediately (already batched) ──
  const clearAll = useCallback(() => {
    const idsToRemove = activeCategory === 'all'
      ? notifications.map((n) => n.id)
      : notifications.filter((n) => n.type === activeCategory).map((n) => n.id);

    if (activeCategory === 'all') {
      setNotifications([]);
    } else {
      setNotifications((prev) => prev.filter((n) => n.type !== activeCategory));
    }

    // Merge any pending individual dismisses + clearAll ids, flush once
    idsToRemove.forEach((id) => dismissQueueRef.current.add(id));
    flushDismissQueue();
  }, [activeCategory, notifications, flushDismissQueue]);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (socket?.connected) {
      emitEvent(socket, {
        event: 'notification:mark-read',
        data: { notificationId: id },
      }).catch(() => {});
    }
  }, [socket]);

  // Mark all unread as read — single server call
  const markAllAsRead = useCallback(() => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    if (socket?.connected) {
      emitEvent(socket, {
        event: 'notification:mark-all-read',
        data: { notificationIds: unreadIds },
      }).catch(() => {});
    }
  }, [notifications, socket]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    return notifications.filter((n) => n.type === activeCategory);
  }, [notifications, activeCategory]);

  const counts = useMemo(() => {
    const map = { all: notifications.length };
    for (const cat of CATEGORIES.slice(1)) {
      map[cat] = notifications.filter((n) => n.type === cat).length;
    }
    return map;
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const grouped = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { Today: [], Yesterday: [], Earlier: [] };

    for (const n of filtered) {
      const date = new Date(n.createdAt);
      date.setHours(0, 0, 0, 0);
      if (date.getTime() >= today.getTime()) {
        groups.Today.push(n);
      } else if (date.getTime() >= yesterday.getTime()) {
        groups.Yesterday.push(n);
      } else {
        groups.Earlier.push(n);
      }
    }

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const value = useMemo(() => ({
    notifications: filtered,
    allNotifications: notifications,
    grouped,
    activeCategory,
    setActiveCategory,
    dismiss,
    clearAll,
    markAsRead,
    markAllAsRead,
    counts,
    unreadCount,
    categories: CATEGORIES,
  }), [filtered, notifications, grouped, activeCategory, dismiss, clearAll, markAsRead, markAllAsRead, counts, unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
