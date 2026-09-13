/**
 * @file TitleDomAdapter.js
 * @description Adapter Pattern para encapsular seletores e mutações no DOM do YouTube referentes ao título do vídeo.
 * 
 * Responsabilidade:
 * - Localizar o elemento de título principal do vídeo no DOM de forma resiliente a variações de layout.
 * - Atualizar o conteúdo textual na interface visual (h1/yt-formatted-string).
 * - Atualizar metadados do documento (document.title e meta tags).
 * - Marcar e inspecionar o estado do elemento para evitar mutações redundantes.
 */

class TitleDomAdapter {
  #titleSelectors;

  constructor() {
    this.#titleSelectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      '#title h1 yt-formatted-string',
      'h1.ytd-watch-metadata',
      'ytd-watch-metadata #title',
      'h1.title.ytd-video-primary-info-renderer yt-formatted-string',
      'h1.title.ytd-video-primary-info-renderer',
      '#container > h1 .yt-core-attributed-string'
    ];
  }

  /**
   * Localiza o elemento de título do vídeo atual na página do YouTube.
   * Varre seletores prioritários do layout moderno e variações legadas.
   * 
   * @returns {HTMLElement|null}
   */
  getTitleElement() {
    for (const selector of this.#titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.isConnected) {
        return el;
      }
    }
    return null;
  }

  /**
   * Retorna o texto atualmente exibido no elemento de título.
   * 
   * @returns {string|null}
   */
  getCurrentTitleText() {
    const el = this.getTitleElement();
    return el ? el.textContent.trim() : null;
  }

  /**
   * Verifica se o título visual já corresponde ao título original fornecido.
   * 
   * @param {string} originalTitle - Título que se deseja comparar.
   * @returns {boolean}
   */
  isAlreadyUpdated(originalTitle) {
    if (!originalTitle || typeof originalTitle !== 'string') {
      return false;
    }

    const current = this.getCurrentTitleText();
    return current === originalTitle.trim();
  }

  /**
   * Atualiza o título no elemento visual do YouTube, no título da aba do navegador e nas meta tags.
   * 
   * @param {string} originalTitle - Título original obtido via oEmbed.
   * @returns {boolean} True se o elemento visual foi encontrado e atualizado.
   */
  updateTitle(originalTitle) {
    if (!originalTitle || typeof originalTitle !== 'string') {
      return false;
    }

    const cleanTitle = originalTitle.trim();
    const titleEl = this.getTitleElement();

    if (!titleEl) {
      return false;
    }

    // 1. Atualização do elemento visual no DOM
    titleEl.textContent = cleanTitle;
    titleEl.setAttribute('title', cleanTitle);
    titleEl.setAttribute('aria-label', cleanTitle);
    titleEl.dataset.antidubOriginalTitle = 'true';

    // 2. Atualização do título da aba do navegador
    document.title = `${cleanTitle} - YouTube`;

    // 3. Atualização de meta tags da página (SEO/Social)
    this.#updateMetaTags(cleanTitle);

    return true;
  }

  /**
   * Atualiza as meta tags de título no cabeçalho do documento para manter coerência.
   * 
   * @param {string} cleanTitle - Título original limpo.
   */
  #updateMetaTags(cleanTitle) {
    const metaSelectors = [
      'meta[name="title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ];

    for (const selector of metaSelectors) {
      const metaEl = document.querySelector(selector);
      if (metaEl) {
        metaEl.setAttribute('content', cleanTitle);
      }
    }
  }
}

window.TitleDomAdapter = TitleDomAdapter;

