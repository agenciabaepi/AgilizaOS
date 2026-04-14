/**
 * Som curto de notificação via Web Audio API (sem arquivo estático).
 * Usa um único AudioContext e tenta resume() para contornar autoplay.
 */

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new AC();
  }
  return sharedContext;
}

/** Chame após gesto do usuário (ex.: primeiro clique) para permitir som depois. */
export async function unlockNotificationAudio(): Promise<void> {
  const audioContext = getAudioContext();
  if (!audioContext || audioContext.state !== 'suspended') return;
  try {
    await audioContext.resume();
  } catch {
    /* ignore */
  }
}

export async function playNotificationSound(): Promise<void> {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const t = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(800, t);
    oscillator.frequency.setValueAtTime(600, t + 0.1);
    oscillator.frequency.setValueAtTime(800, t + 0.2);

    gainNode.gain.setValueAtTime(0.25, t);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    oscillator.start(t);
    oscillator.stop(t + 0.35);
  } catch {
    // Autoplay ou contexto indisponível — falha silenciosa
  }
}
