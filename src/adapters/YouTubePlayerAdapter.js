/**
 * @file YouTubePlayerAdapter.js
 * @description Adapter Pattern para isolar e padronizar todas as chamadas ao elemento nativo #movie_player.
 */

class YouTubePlayerAdapter {
  #elementId;
  #logger;

  /**
   * @param {string} [elementId='movie_player'] - ID do elemento do player no DOM
   * @param {Logger} [logger=null]
   */
  constructor(elementId = 'movie_player', logger = null) {
    this.#elementId = elementId;
    this.#logger = logger || (window.Logger ? window.Logger.forAudio() : console);
  }

  /**
   * Obtém a referência ao elemento HTML do player.
   * @returns {HTMLElement|null}
   */
  getElement() {
    return document.getElementById(this.#elementId);
  }

  /**
   * Verifica se o player já foi inicializado e expõe os métodos de áudio necessários.
   * @returns {boolean}
   */
  isReady() {
    const el = this.getElement();
    return Boolean(el && typeof el.getAvailableAudioTracks === 'function');
  }

  /**
   * Verifica se o player está atualmente reproduzindo um anúncio.
   * @returns {boolean}
   */
  isAdShowing() {
    const el = this.getElement();
    if (!el) return false;

    return (
      el.classList?.contains('ad-showing') ||
      el.classList?.contains('ad-interrupting') ||
      el.hasAttribute?.('ad-showing') ||
      (typeof el.isAd === 'function' && el.isAd())
    );
  }

  /**
   * Retorna a lista de faixas de áudio disponibilizadas pelo player.
   * @returns {Array<Object>|null}
   */
  getAvailableAudioTracks() {
    const el = this.getElement();
    if (!el || typeof el.getAvailableAudioTracks !== 'function') {
      return null;
    }

    try {
      return el.getAvailableAudioTracks();
    } catch (err) {
      this.#logger.warn('Erro ao invocar getAvailableAudioTracks():', err);
      return null;
    }
  }

  /**
   * Retorna a faixa atualmente ativa no player.
   * @returns {Object|string|null}
   */
  getCurrentAudioTrack() {
    const el = this.getElement();
    if (!el || typeof el.getAudioTrack !== 'function') {
      return null;
    }

    try {
      return el.getAudioTrack();
    } catch (err) {
      this.#logger.warn('Erro ao invocar getAudioTrack():', err);
      return null;
    }
  }

  /**
   * Normaliza e extrai o identificador (ID) de uma faixa, seja ela string ou objeto.
   * @param {Object|string|null} track
   * @returns {string|null}
   */
  getTrackId(track) {
    if (!track) return null;
    if (typeof track === 'string') return track;
    return track.id || track.audioTrackId || null;
  }

  /**
   * Altera a faixa de áudio com suporte a fallback caso o player exija string ID em vez de objeto.
   * @param {Object|string} track - Objeto da faixa ou string com o ID
   * @returns {boolean} True se a chamada foi executada sem erros
   */
  setAudioTrack(track) {
    const el = this.getElement();
    if (!el || typeof el.setAudioTrack !== 'function') {
      return false;
    }

    try {
      el.setAudioTrack(track);
      return true;
    } catch (errPrimary) {
      this.#logger.warn('Falha ao passar objeto para setAudioTrack(). Tentando via ID direto:', errPrimary);
      const trackId = this.getTrackId(track);
      if (trackId) {
        try {
          el.setAudioTrack(trackId);
          return true;
        } catch (errSecondary) {
          this.#logger.error('Falha fatal ao invocar setAudioTrack():', errSecondary);
        }
      }
    }

    return false;
  }

  /**
   * Obtém os metadados do player do vídeo atual.
   * @returns {Object|null}
   */
  getPlayerResponse() {
    const el = this.getElement();
    if (el && typeof el.getPlayerResponse === 'function') {
      try {
        return el.getPlayerResponse();
      } catch (err) {
        // Ignora e faz fallback para variável global
      }
    }

    return window.ytInitialPlayerResponse || null;
  }
}

window.YouTubePlayerAdapter = YouTubePlayerAdapter;

