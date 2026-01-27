// Call ringtone utility using Web Audio API
// Generates synthetic ringtones for incoming and outgoing calls

let audioContext = null;
let currentRingtone = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Play outgoing ring tone (caller hears while waiting for callee to answer).
 * Pattern: two short tones, 3-second pause, repeat.
 * Similar to a standard phone "ring-ring... ring-ring..." cadence.
 */
export function playOutgoingRing() {
  stopRingtone();

  try {
    const ctx = getAudioContext();
    let isPlaying = true;
    let timeoutId = null;

    const playPattern = () => {
      if (!isPlaying) return;

      try {
        const now = ctx.currentTime;

        // First tone burst (440Hz + 480Hz = US dial ring)
        const osc1a = ctx.createOscillator();
        const osc1b = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1a.type = "sine";
        osc1a.frequency.value = 440;
        osc1b.type = "sine";
        osc1b.frequency.value = 480;
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.setValueAtTime(0.15, now + 0.8);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc1a.connect(gain1);
        osc1b.connect(gain1);
        gain1.connect(ctx.destination);
        osc1a.start(now);
        osc1b.start(now);
        osc1a.stop(now + 1.0);
        osc1b.stop(now + 1.0);

        // Second tone burst after short gap
        const osc2a = ctx.createOscillator();
        const osc2b = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2a.type = "sine";
        osc2a.frequency.value = 440;
        osc2b.type = "sine";
        osc2b.frequency.value = 480;
        gain2.gain.setValueAtTime(0.001, now + 1.0);
        gain2.gain.setValueAtTime(0.15, now + 1.2);
        gain2.gain.setValueAtTime(0.15, now + 2.0);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
        osc2a.connect(gain2);
        osc2b.connect(gain2);
        gain2.connect(ctx.destination);
        osc2a.start(now + 1.2);
        osc2b.start(now + 1.2);
        osc2a.stop(now + 2.2);
        osc2b.stop(now + 2.2);
      } catch {
        // ignore oscillator scheduling errors
      }

      // Repeat pattern every 4 seconds (2s ring + 2s silence)
      timeoutId = setTimeout(playPattern, 4000);
    };

    currentRingtone = {
      stop: () => {
        isPlaying = false;
        if (timeoutId) clearTimeout(timeoutId);
      },
    };

    playPattern();
  } catch {
    // Silently fail - ringtone is non-critical
  }
}

/**
 * Play incoming ring tone (callee hears when receiving a call).
 * Pattern: melodic ascending tones, 1.5-second pause, repeat.
 * More noticeable and attention-grabbing than the outgoing tone.
 */
export function playIncomingRing() {
  stopRingtone();

  try {
    const ctx = getAudioContext();
    let isPlaying = true;
    let timeoutId = null;

    const playPattern = () => {
      if (!isPlaying) return;

      try {
        const now = ctx.currentTime;

        // Melodic ascending ring: 3 quick tones going up
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord arpeggio)
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const start = now + i * 0.18;
          gain.gain.setValueAtTime(0.25, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.15);
        });

        // Second burst — same pattern, slightly louder
        const freqs2 = [523.25, 659.25, 783.99];
        freqs2.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const start = now + 0.7 + i * 0.18;
          gain.gain.setValueAtTime(0.3, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.15);
        });
      } catch {
        // ignore oscillator scheduling errors
      }

      // Repeat every 2 seconds
      timeoutId = setTimeout(playPattern, 2000);
    };

    currentRingtone = {
      stop: () => {
        isPlaying = false;
        if (timeoutId) clearTimeout(timeoutId);
      },
    };

    playPattern();
  } catch {
    // Silently fail
  }
}

/**
 * Stop any currently playing ringtone.
 */
export function stopRingtone() {
  if (currentRingtone) {
    currentRingtone.stop();
    currentRingtone = null;
  }
}
