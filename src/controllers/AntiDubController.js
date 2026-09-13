/**
 * @file AntiDubController.js
 * @description Controlador central (Facade/Orchestrator) para o contexto principal (MAIN World).
 */

class AntiDubController {
  #playerAdapter;
  #trackResolver;
  #isEnabled;
  #currentVideoId = null;
  #retryTimerId = null;
  #isProcessing = false;
  #logPrefix = '[AntiDUB]';
  #datasetAttr = 'antidubEnabled';
  #eventSettingsChanged = 'antidub:settings-changed';

  /**
   * @param {YouTubePlayerAdapter} [playerAdapter=null]
   * @param {AudioTrackResolver} [trackResolver=null]
   */
  constructor(playerAdapter = null, trackResolver = null) {
    this.#playerAdapter = playerAdapter || new window.YouTubePlayerAdapter();
    this.#trackResolver = trackResolver || new window.AudioTrackResolver();
    this.#isEnabled = document.documentElement?.dataset?.[this.#datasetAttr] !== 'false';
  }

  /**
   * Inicializa o controlador, registrando ouvintes de ciclo de vida e eventos de mídia.
   */
  init() {
    console.log(`${this.#logPrefix} AntiDubController inicializado com sucesso.`);

    // 1. Ouve alterações de preferências emitidas pelo SettingsBridge
    window.addEventListener(this.#eventSettingsChanged, (event) => {
      this.#handleSettingsChanged(Boolean(event.detail?.enabled));
    });

    // 2. Ouve transições de navegação SPA do YouTube
    window.addEventListener('yt-navigate-finish', () => {
      this.#handleNavigation();
    });

    // 3. Ouve evento de início de reprodução em elementos <video>
    document.addEventListener(
      'play',
      (event) => {
        if (event.target && event.target.tagName === 'VIDEO') {
          this.enforceOriginalAudio();
        }
      },
      true
    );

    // 4. Execução imediata caso a página já tenha sido carregada (F5 / Direct Link)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      this.#handleNavigation();
    } else {
      window.addEventListener('DOMContentLoaded', () => this.#handleNavigation());
    }
  }

  /**
   * Extrai o ID do vídeo da URL atual.
   * @returns {string|null}
   */
  getVideoIdFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }
      const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch) {
        return shortsMatch[1];
      }
    } catch (err) {
      // Ignora erro de parsing de URL
    }
    return null;
  }

  /**
   * Cancela qualquer rotina de polling em andamento.
   */
  clearPendingRetries() {
    if (this.#retryTimerId !== null) {
      clearInterval(this.#retryTimerId);
      this.#retryTimerId = null;
    }
    this.#isProcessing = false;
  }

  /**
   * Executa a inspeção das faixas e a aplicação do áudio original através do adapter e do resolver.
   */
  enforceOriginalAudio() {
    this.clearPendingRetries();

    if (!this.#isEnabled) {
      console.log(`${this.#logPrefix} Extensão desativada nas preferências. Nenhuma alteração.`);
      return;
    }

    let attempts = 0;
    const maxAttempts = 30; // 30 tentativas * 250ms = 7.5s
    this.#isProcessing = true;

    this.#retryTimerId = setInterval(() => {
      attempts++;

      // Aguarda player estar pronto
      if (!this.#playerAdapter.isReady()) {
        if (attempts >= maxAttempts) {
          this.clearPendingRetries();
        }
        return;
      }

      // Se houver anúncio rodando, não cancela nem altera faixas
      if (this.#playerAdapter.isAdShowing()) {
        console.log(`${this.#logPrefix} Anúncio em reprodução. Aguardando vídeo principal... (${attempts}/${maxAttempts})`);
        return;
      }

      const tracks = this.#playerAdapter.getAvailableAudioTracks();

      // Aguarda carregamento das faixas DASH
      if (!Array.isArray(tracks) || tracks.length === 0) {
        if (attempts >= maxAttempts) {
          this.clearPendingRetries();
        }
        return;
      }

      // Se só houver 1 faixa, não há dublagem para comutar
      if (tracks.length === 1) {
        console.log(`${this.#logPrefix} Vídeo possui apenas 1 faixa disponível. Nenhuma ação necessária.`);
        this.clearPendingRetries();
        return;
      }

      // Resolve a faixa original através do Strategy Pattern
      const resolution = this.#trackResolver.resolve(this.#playerAdapter, tracks);

      if (!resolution || !resolution.track) {
        if (attempts < maxAttempts) {
          return;
        }
        console.warn(`${this.#logPrefix} Nenhuma faixa original identificada após ${attempts} tentativas:`, tracks);
        this.clearPendingRetries();
        return;
      }

      const originalTrack = resolution.track;
      const originalTrackId = this.#playerAdapter.getTrackId(originalTrack);
      const currentTrack = this.#playerAdapter.getCurrentAudioTrack();
      const currentTrackId = this.#playerAdapter.getTrackId(currentTrack);

      console.log(
        `${this.#logPrefix} Faixa original identificada via ${resolution.strategyName}: "${originalTrack.displayName || originalTrackId}".`
      );

      // Verifica se a faixa atual já é a original
      if (currentTrackId && originalTrackId && currentTrackId === originalTrackId) {
        console.log(`${this.#logPrefix} Faixa atual já é a original (${currentTrackId}). Nenhuma alteração necessária.`);
        this.clearPendingRetries();
        return;
      }

      // Comuta para o áudio original
      console.log(
        `${this.#logPrefix} Dublagem ativa ("${currentTrack?.displayName || currentTrackId || 'Desconhecida'}"). Trocando para original: "${originalTrack.displayName || originalTrackId}"...`
      );

      this.#playerAdapter.setAudioTrack(originalTrack);
      this.clearPendingRetries();
    }, 250);
  }

  /**
   * Trata transição de navegação SPA.
   */
  #handleNavigation() {
    const newVideoId = this.getVideoIdFromUrl();
    if (!newVideoId) {
      this.clearPendingRetries();
      this.#currentVideoId = null;
      return;
    }

    this.#currentVideoId = newVideoId;
    this.enforceOriginalAudio();
  }

  /**
   * Trata alteração reativa de configurações.
   * @param {boolean} newEnabled
   */
  #handleSettingsChanged(newEnabled) {
    const wasEnabled = this.#isEnabled;
    this.#isEnabled = newEnabled;

    console.log(`${this.#logPrefix} Estado alterado para: ${this.#isEnabled ? 'ATIVADO' : 'DESATIVADO'}.`);

    if (!wasEnabled && this.#isEnabled && this.getVideoIdFromUrl()) {
      this.enforceOriginalAudio();
    }
  }
}

window.AntiDubController = AntiDubController;

// Instanciação e execução automática
const antiDubController = new AntiDubController();
antiDubController.init();

