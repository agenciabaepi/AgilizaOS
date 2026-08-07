// Utilitário para reprodução de áudio com fallbacks

export const NOTIFICATION_SOUND_PATH = '/assets/sounds/Msn.mp3';
export const ORCAMENTO_SOUND_PATH = '/assets/sounds/orcamento_audio.mp3';

const DEFAULT_VOLUME = 0.85;
const ORCAMENTO_MAX_ATTEMPTS = 6;
const ORCAMENTO_RETRY_MS = 180;

export class AudioPlayer {
  private static instance: AudioPlayer;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private preloadedByUrl = new Map<string, HTMLAudioElement>();
  private userInteracted = false;
  private permissionRequested = false;
  private pendingSoundUrl: string | null = null;
  private interactionListenersAttached = false;
  private lastOrcamentoPlayAt = 0;

  private constructor() {
    this.preloadSound(NOTIFICATION_SOUND_PATH);
    this.preloadSound(ORCAMENTO_SOUND_PATH);
    this.setupUserInteractionDetection();
  }

  static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer();
    }
    return AudioPlayer.instance;
  }

  private setupUserInteractionDetection(): void {
    if (typeof window === 'undefined' || this.interactionListenersAttached) return;
    this.interactionListenersAttached = true;

    const events = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'] as const;

    const handleUserInteraction = () => {
      void this.onUserInteraction();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });
  }

  private async onUserInteraction(): Promise<void> {
    if (!this.userInteracted) {
      this.userInteracted = true;
    }

    if (!this.permissionRequested) {
      this.permissionRequested = true;
      await this.requestAudioPermission();
    }

    if (this.pendingSoundUrl) {
      const url = this.pendingSoundUrl;
      this.pendingSoundUrl = null;
      await this.playSound(url, 2);
    }
  }

  preloadSound(soundUrl: string): HTMLAudioElement {
    const existing = this.preloadedByUrl.get(soundUrl);
    if (existing) return existing;

    const audio = new Audio(soundUrl);
    audio.volume = DEFAULT_VOLUME;
    audio.preload = 'auto';
    audio.load();
    this.preloadedByUrl.set(soundUrl, audio);
    return audio;
  }

  warmupOrcamentoAudio(): void {
    this.preloadSound(ORCAMENTO_SOUND_PATH);
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      this.isInitialized = true;
      return true;
    } catch {
      return false;
    }
  }

  async requestAudioPermission(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        await this.initialize();
      }

      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      return true;
    } catch {
      return false;
    }
  }

  async playSound(soundUrl: string, maxAttempts = 4): Promise<boolean> {
    await this.requestAudioPermission();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const methods = [
        () => this.playWithPreloadedUrl(soundUrl),
        () => this.playWithSimpleAudio(soundUrl),
        () => this.playWithHTML5Audio(soundUrl),
        () => this.playWithWebAudioAPI(soundUrl),
      ];

      for (const method of methods) {
        try {
          if (await method()) {
            this.userInteracted = true;
            return true;
          }
        } catch {
          /* próximo método */
        }
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, ORCAMENTO_RETRY_MS));
      }
    }

    this.pendingSoundUrl = soundUrl;
    return false;
  }

  async playNotificationSound(soundUrl: string = NOTIFICATION_SOUND_PATH): Promise<boolean> {
    return this.playSound(soundUrl);
  }

  async playOrcamentoSound(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastOrcamentoPlayAt < 800) return true;

    this.warmupOrcamentoAudio();
    const success = await this.playSound(ORCAMENTO_SOUND_PATH, ORCAMENTO_MAX_ATTEMPTS);
    if (success) {
      this.lastOrcamentoPlayAt = now;
    }
    return success;
  }

  private async playWithPreloadedUrl(soundUrl: string): Promise<boolean> {
    const audio = this.preloadSound(soundUrl);
    audio.currentTime = 0;
    audio.volume = DEFAULT_VOLUME;
    await audio.play();
    return true;
  }

  private async playWithHTML5Audio(soundUrl: string): Promise<boolean> {
    const audio = new Audio(soundUrl);
    audio.volume = DEFAULT_VOLUME;
    audio.preload = 'auto';

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      await audio.play();
      return true;
    }

    return new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), 4000);

      const tryPlay = () => {
        audio
          .play()
          .then(() => {
            clearTimeout(timeout);
            resolve(true);
          })
          .catch(reject);
      };

      audio.addEventListener('canplaythrough', tryPlay, { once: true });
      audio.addEventListener('loadeddata', tryPlay, { once: true });
      audio.addEventListener(
        'error',
        () => {
          clearTimeout(timeout);
          reject(new Error('load error'));
        },
        { once: true }
      );

      audio.load();
    });
  }

  private async playWithWebAudioAPI(soundUrl: string): Promise<boolean> {
    if (!this.audioContext) {
      await this.initialize();
      if (!this.audioContext) return false;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const response = await fetch(soundUrl);
    if (!response.ok) return false;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
    return true;
  }

  private async playWithSimpleAudio(soundUrl: string): Promise<boolean> {
    const audio = new Audio(soundUrl);
    audio.volume = DEFAULT_VOLUME;
    await audio.play();
    return true;
  }

  createAudioActivationButton(soundUrl: string = ORCAMENTO_SOUND_PATH): HTMLElement | null {
    if (typeof window === 'undefined') return null;

    const existing = document.getElementById('audio-activation-btn');
    if (existing) return existing;

    const button = document.createElement('button');
    button.id = 'audio-activation-btn';
    button.type = 'button';
    button.innerHTML = '🔊 Toque para ativar o som de orçamento';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 14px;
    `;

    button.addEventListener('click', async () => {
      this.userInteracted = true;
      this.permissionRequested = true;
      const success = await this.playSound(soundUrl, ORCAMENTO_MAX_ATTEMPTS);
      if (success) {
        button.remove();
      }
    });

    document.body.appendChild(button);
    return button;
  }
}

export const playNotificationSound = async (
  soundUrl: string = NOTIFICATION_SOUND_PATH
): Promise<boolean> => {
  return AudioPlayer.getInstance().playNotificationSound(soundUrl);
};

export const playOrcamentoNotificationSound = async (): Promise<boolean> => {
  const player = AudioPlayer.getInstance();
  const success = await player.playOrcamentoSound();
  if (!success) {
    player.createAudioActivationButton(ORCAMENTO_SOUND_PATH);
  }
  return success;
};

export const requestAudioPermission = async (): Promise<boolean> => {
  return AudioPlayer.getInstance().requestAudioPermission();
};

export const warmupOrcamentoAudio = (): void => {
  AudioPlayer.getInstance().warmupOrcamentoAudio();
};

export const createAudioActivationButton = (): HTMLElement | null => {
  return AudioPlayer.getInstance().createAudioActivationButton(ORCAMENTO_SOUND_PATH);
};

export const initializeAudioContext = async (): Promise<void> => {
  warmupOrcamentoAudio();
  await requestAudioPermission();
};
