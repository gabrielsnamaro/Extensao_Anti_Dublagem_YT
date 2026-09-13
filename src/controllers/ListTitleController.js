/**
 * @file ListTitleController.js
 * @description Controller/Observer Pattern para orquestrar a destradução de títulos de cards de vídeos listados.
 * 
 * Responsabilidades:
 * - Observar o DOM via MutationObserver para identificar novos cards gerados por scroll infinito ou navegações.
 * - Observar o viewport via IntersectionObserver para aplicar lazy loading (apenas cards visíveis são enfileirados).
 * - Delegar o processamento de busca e atualização para o TitleQueueService e VideoCardDomAdapter.
 * - Reagir a alterações de preferências do usuário emitidas pelo SettingsBridge.
 */

class ListTitleController {
  #cardDomAdapter;
  #queueService;
  #logger;
  #isEnabled;
  #intersectionObserver = null;
  #mutationObserver = null;
  #observedCards = new WeakSet();
  #debounceTimer = null;
  #isObserving = false;
  #datasetAttr = 'antidubEnabled';
  #eventSettingsChanged = 'antidub:settings-changed';

  /**
   * @param {VideoCardDomAdapter} [cardDomAdapter=null]
   * @param {TitleQueueService} [queueService=null]
   * @param {Logger} [logger=null]
   */
  constructor(cardDomAdapter = null, queueService = null, logger = null) {
    this.#cardDomAdapter = cardDomAdapter || new window.VideoCardDomAdapter();
    this.#queueService = queueService || new window.TitleQueueService(null, this.#cardDomAdapter);
    this.#logger = logger || (window.Logger ? window.Logger.forTitle() : console);
    this.#isEnabled = document.documentElement?.dataset?.[this.#datasetAttr] !== 'false';
  }

  /**
   * Inicializa o controlador registrando observadores e ouvintes de eventos.
   */
  init() {
    this.#logger.info('ListTitleController inicializado com sucesso.');

    // 1. Ouve alterações de preferências
    window.addEventListener(this.#eventSettingsChanged, (event) => {
      this.#handleSettingsChanged(Boolean(event.detail?.enabled));
    });

    // 2. Ouve navegações SPA
    window.addEventListener('yt-navigate-finish', () => {
      this.scanAndObserveCards();
    });

    // 3. Inicializa os observers se a extensão estiver ativa
    if (this.#isEnabled) {
      this.#startObserving();
    }
  }

  /**
   * Inicia o IntersectionObserver e o MutationObserver.
   */
  #startObserving() {
    if (this.#isObserving) return;
    this.#isObserving = true;

    // 1. IntersectionObserver com margem antecipada de 200px para fluidez visual
    if (typeof window.IntersectionObserver === 'function') {
      this.#intersectionObserver = new window.IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const cardEl = entry.target;
              this.#intersectionObserver.unobserve(cardEl);

              const videoId = this.#cardDomAdapter.extractVideoId(cardEl);
              if (videoId) {
                this.#queueService.enqueue(cardEl, videoId);
              }
            }
          }
        },
        {
          root: null,
          rootMargin: '200px 0px 200px 0px',
          threshold: 0.01
        }
      );
    }

    // 2. MutationObserver no DOM com debounce para acompanhar scroll infinito e novos cards
    if (typeof window.MutationObserver === 'function') {
      this.#mutationObserver = new window.MutationObserver((mutations) => {
        let hasNewNodes = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            hasNewNodes = true;
            break;
          }
        }

        if (hasNewNodes) {
          if (this.#debounceTimer) {
            clearTimeout(this.#debounceTimer);
          }
          this.#debounceTimer = setTimeout(() => {
            this.scanAndObserveCards();
          }, 150);
        }
      });

      this.#mutationObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    // Varredura inicial dos cards já presentes na página
    this.scanAndObserveCards();
  }

  /**
   * Para os observadores e limpa a fila.
   */
  #stopObserving() {
    if (!this.#isObserving) return;
    this.#isObserving = false;

    if (this.#debounceTimer) {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = null;
    }

    if (this.#intersectionObserver) {
      this.#intersectionObserver.disconnect();
      this.#intersectionObserver = null;
    }

    if (this.#mutationObserver) {
      this.#mutationObserver.disconnect();
      this.#mutationObserver = null;
    }

    this.#observedCards = new WeakSet();
    this.#queueService.clear();
  }

  /**
   * Varre o documento em busca de novos cards de vídeos e os registra no observador de visibilidade.
   */
  scanAndObserveCards() {
    if (!this.#isEnabled) {
      return;
    }

    const unprocessedCards = this.#cardDomAdapter.findUnprocessedCards(document);

    for (const card of unprocessedCards) {
      if (this.#observedCards.has(card)) {
        continue;
      }

      // Se não houver IntersectionObserver disponível, envia direto à fila
      if (!this.#intersectionObserver) {
        const videoId = this.#cardDomAdapter.extractVideoId(card);
        if (videoId) {
          this.#queueService.enqueue(card, videoId);
        }
      } else {
        this.#observedCards.add(card);
        this.#intersectionObserver.observe(card);
      }
    }
  }

  /**
   * Trata alterações nas preferências do usuário.
   * 
   * @param {boolean} newEnabled
   */
  #handleSettingsChanged(newEnabled) {
    this.#isEnabled = newEnabled;

    if (this.#isEnabled) {
      this.#startObserving();
    } else {
      this.#stopObserving();
    }
  }
}

window.ListTitleController = ListTitleController;

// Instanciação e execução automática
const listTitleController = new ListTitleController();
listTitleController.init();
