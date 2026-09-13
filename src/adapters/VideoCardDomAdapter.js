/**
 * @file VideoCardDomAdapter.js
 * @description Adapter Pattern para localização, extração e atualização de cards de vídeos listados no YouTube.
 * 
 * Responsabilidade:
 * - Unificar e encapsular os seletores CSS dos diferentes tipos de cards (Home, Busca, Sidebar, Canais).
 * - Extrair o `videoId` a partir dos links internos (`href`) do card.
 * - Localizar e atualizar os elementos de texto do título e seus tooltips/acessibilidade no card.
 * - Controlar flags de processamento no DOM para evitar mutações redundantes.
 */

class VideoCardDomAdapter {
  #cardSelectors;
  #titleSelectors;

  constructor() {
    this.#cardSelectors = [
      'ytd-rich-item-renderer',
      'ytd-compact-video-renderer',
      'ytd-video-renderer',
      'ytd-grid-video-renderer'
    ];

    this.#titleSelectors = [
      '#video-title',
      'yt-formatted-string#video-title',
      'span#video-title',
      'a#video-title-link'
    ];
  }

  /**
   * Retorna o seletor CSS combinado de todos os cards suportados.
   * @returns {string}
   */
  getCardSelectorString() {
    return this.#cardSelectors.join(', ');
  }

  /**
   * Extrai o identificador único do vídeo (videoId) a partir de um elemento de card.
   * 
   * @param {HTMLElement} cardElement 
   * @returns {string|null}
   */
  extractVideoId(cardElement) {
    if (!cardElement || typeof cardElement.querySelector !== 'function') {
      return null;
    }

    const linkEl = cardElement.querySelector(
      'a#thumbnail[href], a#video-title-link[href], a[href*="watch?v="], a[href*="/shorts/"]'
    );

    if (!linkEl || !linkEl.href) {
      return null;
    }

    const href = linkEl.href;

    // 1. Tenta extrair de URLs convencionais: watch?v=...
    const matchWatch = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (matchWatch && matchWatch[1]) {
      return matchWatch[1];
    }

    // 2. Tenta extrair de URLs do YouTube Shorts: /shorts/...
    const matchShorts = href.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (matchShorts && matchShorts[1]) {
      return matchShorts[1];
    }

    return null;
  }

  /**
   * Localiza o nó do elemento de título dentro do card.
   * 
   * @param {HTMLElement} cardElement 
   * @returns {HTMLElement|null}
   */
  getTitleElement(cardElement) {
    if (!cardElement || typeof cardElement.querySelector !== 'function') {
      return null;
    }

    for (const selector of this.#titleSelectors) {
      const el = cardElement.querySelector(selector);
      if (el) {
        return el;
      }
    }

    return null;
  }

  /**
   * Verifica se o card já foi marcado como processado pela extensão.
   * 
   * @param {HTMLElement} cardElement 
   * @returns {boolean}
   */
  isProcessed(cardElement) {
    return cardElement?.dataset?.antidubCardProcessed === 'true';
  }

  /**
   * Marca o card como processado para evitar verificações duplicadas.
   * 
   * @param {HTMLElement} cardElement 
   */
  markAsProcessed(cardElement) {
    if (cardElement?.dataset) {
      cardElement.dataset.antidubCardProcessed = 'true';
    }
  }

  /**
   * Atualiza o texto do título do card no DOM visual, tooltip e atributos de acessibilidade.
   * 
   * @param {HTMLElement} cardElement - Elemento container do card
   * @param {string} originalTitle - Título original do vídeo
   * @returns {boolean} True se o elemento foi atualizado com sucesso
   */
  updateCardTitle(cardElement, originalTitle) {
    if (!cardElement || !originalTitle || typeof originalTitle !== 'string') {
      return false;
    }

    const titleEl = this.getTitleElement(cardElement);
    if (!titleEl) {
      return false;
    }

    const cleanTitle = originalTitle.trim();

    // Se já estiver com o título correto, apenas marca como processado
    if (titleEl.textContent.trim() === cleanTitle) {
      this.markAsProcessed(cardElement);
      return true;
    }

    titleEl.textContent = cleanTitle;
    titleEl.setAttribute('title', cleanTitle);
    titleEl.setAttribute('aria-label', cleanTitle);
    this.markAsProcessed(cardElement);

    return true;
  }

  /**
   * Localiza todos os cards não processados presentes sob o elemento raiz especificado.
   * 
   * @param {HTMLElement} [rootElement=document]
   * @returns {Array<HTMLElement>}
   */
  findUnprocessedCards(rootElement = document) {
    if (!rootElement || typeof rootElement.querySelectorAll !== 'function') {
      return [];
    }

    const cards = Array.from(rootElement.querySelectorAll(this.getCardSelectorString()));
    return cards.filter((card) => !this.isProcessed(card));
  }
}

window.VideoCardDomAdapter = VideoCardDomAdapter;
