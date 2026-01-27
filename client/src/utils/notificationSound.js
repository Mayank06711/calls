// Notification sound utility using Web Audio API
// Falls back gracefully if audio is not available

let audioContext = null;
let isUserInteracted = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Must call this once after user interaction (click/tap) to unlock AudioContext
function unlockAudioContext() {
  if (isUserInteracted) return;
  isUserInteracted = true;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch {
    // ignore
  }
}

// Listen for first user interaction to unlock audio
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown'];
  const handler = () => {
    unlockAudioContext();
    events.forEach((e) => window.removeEventListener(e, handler));
  };
  events.forEach((e) => window.addEventListener(e, handler, { once: true }));
}

/**
 * Plays a short notification chime using Web Audio API.
 * No external audio file needed - generates a pleasant two-tone chime.
 */
export async function playNotificationSound() {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // First tone (higher pitch)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 880; // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second tone (slightly higher, delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1108.73; // C#6
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch {
    // Silently fail - sound is non-critical
  }
}

/**
 * Request browser notification permission.
 * Call this early (e.g. on app mount or after user interaction).
 * Returns the permission status: 'granted', 'denied', or 'default'.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

/**
 * Show a system-level browser notification.
 * Works even when the tab is not focused or browser is minimized.
 */
export function showBrowserNotification(title, options = {}) {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || `notif-${Date.now()}`,
      silent: false, // allow the OS notification sound too
      requireInteraction: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // On click: focus existing tab and navigate via custom event (no page reload)
    notification.onclick = function (event) {
      event.preventDefault();
      notification.close();
      window.focus();

      if (options.url) {
        // Dispatch a custom event so React Router can handle navigation
        // without a full page reload (which would create a new socket)
        window.dispatchEvent(
          new CustomEvent('app:navigate', { detail: { path: options.url } })
        );
      }

      if (options.onClick) options.onClick();
    };

    return notification;
  } catch {
    return null;
  }
}
