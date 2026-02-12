// Utilitário para reprodução de áudio com fallbacks
export class AudioPlayer {
  private static instance: AudioPlayer;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isInitialized = false;
  private preloadedAudio: HTMLAudioElement | null = null;
  private userInteracted = false;
  private permissionRequested = false;

  private constructor() {
    // Pré-carregar o áudio quando a instância for criada
    this.preloadAudio();
    // Detectar interação do usuário
    this.setupUserInteractionDetection();
  }

  static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer();
    }
    return AudioPlayer.instance;
  }

  // Detectar interação do usuário para permitir autoplay
  private setupUserInteractionDetection(): void {
    if (typeof window === 'undefined') return;

    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    
    const handleUserInteraction = async () => {
      if (!this.userInteracted) {
        console.log('👆 AudioPlayer: Interação do usuário detectada!');
        this.userInteracted = true;
        
        // Solicitar permissão de áudio na primeira interação
        if (!this.permissionRequested) {
          await this.requestAudioPermission();
          this.permissionRequested = true;
        }
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true });
    });
  }

  // Pré-carregar o áudio para melhorar a confiabilidade
  private preloadAudio(): void {
    try {
      console.log('🔄 AudioPlayer: Pré-carregando áudio...');
      this.preloadedAudio = new Audio('/assets/sounds/Msn.mp3');
      this.preloadedAudio.volume = 0.7;
      this.preloadedAudio.preload = 'auto';
      this.preloadedAudio.crossOrigin = 'anonymous';
      
      this.preloadedAudio.addEventListener('canplaythrough', () => {
        console.log('✅ AudioPlayer: Áudio pré-carregado com sucesso!');
      });
      
      this.preloadedAudio.addEventListener('error', (error) => {
        console.warn('⚠️ AudioPlayer: Erro ao pré-carregar áudio:', error);
      });
      
      this.preloadedAudio.load();
    } catch (error) {
      console.warn('⚠️ AudioPlayer: Erro ao criar instância pré-carregada:', error);
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Tentar criar AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        
        // Se estiver suspenso, tentar resumir
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      this.isInitialized = true;
      console.log('✅ AudioPlayer: Inicializado com sucesso');
      return true;
    } catch (error) {
      console.warn('⚠️ AudioPlayer: Erro ao inicializar:', error);
      return false;
    }
  }

  async playNotificationSound(): Promise<boolean> {
    console.log('🔔 AudioPlayer: Tentando reproduzir som de notificação...');
    console.log(`👆 AudioPlayer: Usuário interagiu: ${this.userInteracted}`);

    // Sem gesto do usuário, navegadores bloqueiam áudio. Tentar apenas HTML5 uma vez.
    if (!this.userInteracted) {
      try {
        const audio = new Audio('/assets/sounds/Msn.mp3');
        audio.volume = 0.7;
        await audio.play();
        this.userInteracted = true;
        console.log('✅ AudioPlayer: Som reproduzido (sem gesto prévio).');
        return true;
      } catch {
        console.log('⚠️ AudioPlayer: Reprodução bloqueada até haver interação (clique/toque/tecla).');
        return false;
      }
    }

    // Tentar múltiplas vezes com diferentes métodos (fallback)
    const methods = [
      () => this.playWithPreloadedAudio(), // Usar áudio pré-carregado
      () => this.playWithHTML5Audio(),
      () => this.playWithWebAudioAPI(),
      () => this.playWithSimpleAudio(), // Método mais simples
      () => this.playWithHTML5Audio(), // Retry HTML5
      () => this.playWithWebAudioAPI()  // Retry Web Audio
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`🎵 AudioPlayer: Tentativa ${i + 1}/${methods.length}`);
        const success = await methods[i]();
        if (success) {
          console.log(`✅ AudioPlayer: Sucesso na tentativa ${i + 1}!`);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ AudioPlayer: Tentativa ${i + 1} falhou:`, error);
      }
      
      // Pequena pausa entre tentativas (menor para tempo real)
      if (i < methods.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.warn('⚠️ AudioPlayer: Todas as tentativas falharam');
    return false;
  }

  private async playWithHTML5Audio(): Promise<boolean> {
    try {
      console.log('🎵 AudioPlayer: Tentando com HTML5 Audio...');
      
      const audio = new Audio('/assets/sounds/Msn.mp3');
      audio.volume = 0.7;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      // Configurar eventos
      const playPromise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout ao carregar áudio'));
        }, 3000);

        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          console.log('📱 AudioPlayer: Áudio carregado, tentando reproduzir...');
          
          audio.play().then(() => {
            console.log('✅ AudioPlayer: HTML5 Audio funcionou!');
            resolve(true);
          }).catch(playError => {
            console.warn('⚠️ AudioPlayer: Erro ao reproduzir:', playError);
            reject(playError);
          });
        });

        audio.addEventListener('error', (error) => {
          clearTimeout(timeout);
          console.warn('⚠️ AudioPlayer: Erro ao carregar áudio:', error);
          reject(error);
        });

        audio.addEventListener('loadstart', () => {
          console.log('📱 AudioPlayer: Iniciando carregamento...');
        });
      });

      // Iniciar carregamento
      audio.load();
      
      return await playPromise;

    } catch (error) {
      console.warn('⚠️ AudioPlayer: HTML5 Audio falhou:', error);
      return false;
    }
  }

  private async playWithWebAudioAPI(): Promise<boolean> {
    try {
      console.log('🎵 AudioPlayer: Tentando com Web Audio API...');
      
      if (!this.audioContext) {
        await this.initialize();
        if (!this.audioContext) return false;
      }

      // Carregar o arquivo de áudio
      const response = await fetch('/assets/sounds/Msn.mp3');
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Criar source e reproduzir
      const source = this.audioContext.createBufferSource();
      source.buffer = this.audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();

      console.log('✅ AudioPlayer: Web Audio API funcionou!');
      return true;

    } catch (error) {
      console.warn('⚠️ AudioPlayer: Web Audio API falhou:', error);
      return false;
    }
  }

  // Método usando áudio pré-carregado
  private async playWithPreloadedAudio(): Promise<boolean> {
    try {
      console.log('🎵 AudioPlayer: Tentando com áudio pré-carregado...');
      
      if (!this.preloadedAudio) {
        console.warn('⚠️ AudioPlayer: Áudio pré-carregado não disponível');
        return false;
      }
      
      // Resetar o áudio para o início
      this.preloadedAudio.currentTime = 0;
      
      // Tentar reproduzir
      await this.preloadedAudio.play();
      console.log('✅ AudioPlayer: Áudio pré-carregado funcionou!');
      return true;

    } catch (error) {
      console.warn('⚠️ AudioPlayer: Áudio pré-carregado falhou:', error);
      return false;
    }
  }

  // Método mais simples e direto
  private async playWithSimpleAudio(): Promise<boolean> {
    try {
      console.log('🎵 AudioPlayer: Tentando método simples...');
      
      const audio = new Audio('/assets/sounds/Msn.mp3');
      audio.volume = 0.7;
      
      // Tentar reproduzir imediatamente
      await audio.play();
      console.log('✅ AudioPlayer: Método simples funcionou!');
      return true;

    } catch (error) {
      console.warn('⚠️ AudioPlayer: Método simples falhou:', error);
      return false;
    }
  }

  // Método para solicitar permissão de áudio
  async requestAudioPermission(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        await this.initialize();
      }

      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('✅ AudioPlayer: Permissão de áudio concedida');
      return true;
    } catch (error) {
      console.warn('⚠️ AudioPlayer: Erro ao solicitar permissão:', error);
      return false;
    }
  }

  // Método para criar botão de ativação de áudio (fallback apenas quando necessário)
  createAudioActivationButton(): HTMLElement | null {
    if (typeof window === 'undefined' || this.userInteracted) return null;
    
    // Não criar botão automaticamente - tentar reproduzir som primeiro
    console.log('🔔 AudioPlayer: Tentando reproduzir som sem botão de ativação...');
    this.playNotificationSound();
    return null;

    const button = document.createElement('button');
    button.innerHTML = '🔊 Ativar Notificações Sonoras';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #D1FE6E;
      color: #000;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 14px;
    `;

    button.addEventListener('click', async () => {
      console.log('🔊 AudioPlayer: Usuário clicou para ativar áudio');
      this.userInteracted = true;
      this.permissionRequested = true;
      
      // Testar reprodução
      const success = await this.playNotificationSound();
      if (success) {
        button.innerHTML = '✅ Áudio Ativado!';
        button.style.background = '#4CAF50';
        button.style.color = '#fff';
        setTimeout(() => {
          button.remove();
        }, 2000);
      } else {
        button.innerHTML = '❌ Erro ao Ativar';
        button.style.background = '#f44336';
        button.style.color = '#fff';
      }
    });

    document.body.appendChild(button);
    return button;
  }
}

// Função helper para usar o AudioPlayer
export const playNotificationSound = async (): Promise<boolean> => {
  const player = AudioPlayer.getInstance();
  return await player.playNotificationSound();
};

// Função para solicitar permissão de áudio
export const requestAudioPermission = async (): Promise<boolean> => {
  const player = AudioPlayer.getInstance();
  return await player.requestAudioPermission();
};

// Função para criar botão de ativação de áudio
export const createAudioActivationButton = (): HTMLElement | null => {
  const player = AudioPlayer.getInstance();
  return player.createAudioActivationButton();
};

// Não inicializar áudio automaticamente: o contexto só deve ser criado/retomado
// após um gesto do usuário (clique, toque, tecla). O AudioPlayer já registra
// esses eventos no construtor e ativa permissão na primeira interação.
export const initializeAudioContext = async (): Promise<void> => {
  // No-op: evita erro "AudioContext was not allowed to start" em carregamento.
};
