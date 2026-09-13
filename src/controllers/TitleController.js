/**
 * @file TitleController.js
 * @description Controlador central (Controller/Facade Pattern) para a restauração de títulos originais de vídeos do YouTube.
 * 
 * Responsabilidade:
 * - Escutar eventos de navegação da SPA do YouTube (`yt-navigate-finish`) e recarregamento de página.
 * - Escutar alterações de preferências do usuário emitidas pelo SettingsBridge.
 * - Coordenar a busca do título original via CachedTitleGateway (Proxy Pattern).
 * - Coordenar a mutação no DOM através do TitleDomAdapter (Adapter Pattern) com polling resiliente.
 * - Evitar condições de corrida (race conditions) em navegações rápidas entre vídeos.
 */

class TitleController {
  #titleGateway;
  #domAdapter;
  #isEnabled;
  #currentVideoId = null;
  #retryTimerId = null;
  #isProcessing = false;
  #logPrefix = '[AntiDUB][Title]';
  #datasetAttr = 'antidubEnabled';
  #eventSettingsChanged = 'antidub:settings-changed';

  /**
   * @param {CachedTitleGateway} [titleGateway=null] - Proxy de cache e gateway HTTP.
   * @param {TitleDomAdapter} [domAdapter=null] - Adapter para manipulação do DOM.
   */
  constructor(titleGateway = null, domAdapter = null) {
    this.#titleGateway = titleGateway || new window.CachedTitleGateway();
    this.#domAdapter = domAdapter || new window.TitleDomAdapter();
    this.#isEnabled = document.documentElement?.dataset?.[this.#datasetAttr] !== 'false';
  }

  /**
   * Inicializa o controlador registrando os ouvintes de ciclo de vida e preferências.
   */
  init() {
    console.log(`${this.#logPrefix} TitleController inicializado com sucesso.`);

    // 1. Ouve alterações de preferências emitidas pelo SettingsBridge
    window.addEventListener(this.#eventSettingsChanged, (event) => {
      this.#handleSettingsChanged(Boolean(event.detail?.enabled));
    });

    // 2. Ouve transições de navegação SPA do YouTube
    window.addEventListener('yt-navigate-finish', () => {
      this.#handleNavigation();
    });

    // 3. Execução imediata caso a página já esteja carregada (F5 / Acesso direto à URL)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      this.#handleNavigation();
    } else {
      window.addEventListener('DOMContentLoaded', () => this.#handleNavigation());
    }
  }

  /**
   * Extrai o identificador único do vídeo (videoId) da URL atual.
   * 
   * @returns {string|null}
   */
  getVideoIdFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('v');
      if (v && v.trim().length > 0) {
        return v.trim();
      }

      // Suporte para URLs do YouTube Shorts
      const matchShorts = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (matchShorts && matchShorts[1]) {
        return matchShorts[1];
      }
    } catch (err) {
      console.warn(`${this.#logPrefix} Erro ao extrair videoId da URL:`, err);
    }
    return null;
  }

  /**
   * Limpa qualquer rotina pendente de polling no DOM.
   */
  clearPendingRetries() {
    if (this.#retryTimerId !== null) {
      clearInterval(this.#retryTimerId);
      this.#retryTimerId = null;
    }
  }

  /**
   * Executa a busca e aplicação do título original para o vídeo atual.
   */
  async restoreOriginalTitle() {
    if (!this.#isEnabled) {
      return;
    }

    const videoId = this.getVideoIdFromUrl();
    if (!videoId) {
      this.clearPendingRetries();
      return;
    }

    if (this.#isProcessing) {
      return;
    }

    this.#isProcessing = true;

    try {
      // 1. Busca o título original via Gateway com Cache
      const originalTitle = await this.#titleGateway.fetchOriginalTitle(videoId);

      // Se o usuário já navegou para outro vídeo enquanto o fetch ocorria, aborta
      if (this.getVideoIdFromUrl() !== videoId) {
        return;
      }

      if (!originalTitle) {
        console.warn(`${this.#logPrefix} Não foi possível obter o título original para ${videoId}.`);
        return;
      }

      // 2. Aplicação com polling seguro no DOM (até 20 tentativas x 200ms = 4s)
      this.clearPendingRetries();

      let attempts = 0;
      const maxAttempts = 20;

      this.#retryTimerId = setInterval(() => {
        attempts++;

        // Verifica se a URL mudou durante o polling
        if (this.getVideoIdFromUrl() !== videoId) {
          this.clearPendingRetries();
          return;
        }

        const titleEl = this.#domAdapter.getTitleElement();

        if (titleEl) {
          if (this.#domAdapter.isAlreadyUpdated(originalTitle)) {
            this.clearPendingRetries();
            return;
          }

          const success = this.#domAdapter.updateTitle(originalTitle);
          if (success) {
            console.log(`${this.#logPrefix} Título original restaurado: "${originalTitle}".`);
            this.clearPendingRetries();
            return;
          }
        }

        if (attempts >= maxAttempts) {
          console.warn(`${this.#logPrefix} Limite de tentativas atingido ao tentar localizar o nó do título no DOM.`);
          this.clearPendingRetries();
        }
      }, 200);

    } catch (err) {
      console.error(`${this.#logPrefix} Erro inesperado ao restaurar título:`, err);
    } finally {
      this.#isProcessing = false;
    }
  }

  /**
   * Trata a transição de navegação SPA do YouTube.
   */
  #handleNavigation() {
    const newVideoId = this.getVideoIdFromUrl();
    if (!newVideoId) {
      this.clearPendingRetries();
      this.#currentVideoId = null;
      return;
    }

    this.#currentVideoId = newVideoId;
    this.restoreOriginalTitle();
  }

  /**
   * Trata alterações nas preferências do usuário.
   * 
   * @param {boolean} newEnabled
   */
  #handleSettingsChanged(newEnabled) {
    const wasEnabled = this.#isEnabled;
    this.#isEnabled = newEnabled;

    if (!wasEnabled && this.#isEnabled && this.getVideoIdFromUrl()) {
      this.restoreOriginalTitle();
    }
  }
}

window.TitleController = TitleController;

// Instanciação e execução automática
const titleController = new TitleController();
titleController.init();
