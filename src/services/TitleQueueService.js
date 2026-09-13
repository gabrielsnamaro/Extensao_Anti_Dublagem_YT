/**
 * @file TitleQueueService.js
 * @description Producer-Consumer / Queue Pattern para processamento controlado e sequencial de requisições de títulos.
 * 
 * Responsabilidades:
 * - Gerenciar uma fila de tarefas assíncronas com concorrência estritamente limitada (padrão: 3 simultâneas).
 * - Aplicar taxa controlada (throttling) entre requisições para eliminar o risco de rate limiting (HTTP 429).
 * - Desduplicar requisições: se múltiplos cards na página apontarem para o mesmo `videoId`, executa apenas 1 fetch e atualiza todos eles.
 * - Delegar a busca ao CachedTitleGateway e a mutação ao VideoCardDomAdapter.
 */

class TitleQueueService {
  #titleGateway;
  #cardDomAdapter;
  #logger;
  #maxConcurrent;
  #intervalMs;
  #activeCount = 0;
  #queue = [];
  #pendingVideoIds = new Set();
  #cardSubscribers = new Map();

  /**
   * @param {CachedTitleGateway} [titleGateway=null]
   * @param {VideoCardDomAdapter} [cardDomAdapter=null]
   * @param {Object} [options={}]
   * @param {number} [options.maxConcurrent=3] - Limite máximo de requisições simultâneas.
   * @param {number} [options.intervalMs=60] - Intervalo em milissegundos entre disparos.
   * @param {Logger} [logger=null]
   */
  constructor(
    titleGateway = null,
    cardDomAdapter = null,
    { maxConcurrent = 3, intervalMs = 60 } = {},
    logger = null
  ) {
    this.#titleGateway = titleGateway || new window.CachedTitleGateway();
    this.#cardDomAdapter = cardDomAdapter || new window.VideoCardDomAdapter();
    this.#maxConcurrent = maxConcurrent;
    this.#intervalMs = intervalMs;
    this.#logger = logger || (window.Logger ? window.Logger.forTitle() : console);
  }

  /**
   * Enfileira um card para ter seu título original buscado e atualizado.
   * 
   * @param {HTMLElement} cardElement - Elemento do card no DOM
   * @param {string} videoId - Identificador único do vídeo
   */
  enqueue(cardElement, videoId) {
    if (!cardElement || !videoId || typeof videoId !== 'string') {
      return;
    }

    const cleanVideoId = videoId.trim();

    // 1. Se já estiver em cache, aplica na hora sem entrar na fila de rede
    if (this.#titleGateway.has(cleanVideoId)) {
      const cachedTitle = this.#titleGateway.get(cleanVideoId);
      if (cachedTitle) {
        this.#cardDomAdapter.updateCardTitle(cardElement, cachedTitle);
        return;
      }
    }

    // 2. Registra o card como assinante do videoId
    if (!this.#cardSubscribers.has(cleanVideoId)) {
      this.#cardSubscribers.set(cleanVideoId, []);
    }
    this.#cardSubscribers.get(cleanVideoId).push(cardElement);

    // 3. Se o videoId já estiver na fila ou em execução, não duplica a requisição
    if (this.#pendingVideoIds.has(cleanVideoId)) {
      return;
    }

    this.#pendingVideoIds.add(cleanVideoId);
    this.#queue.push(cleanVideoId);

    this.#processNext();
  }

  /**
   * Processa o próximo item da fila respeitando os limites de concorrência.
   */
  async #processNext() {
    if (this.#activeCount >= this.#maxConcurrent || this.#queue.length === 0) {
      return;
    }

    const videoId = this.#queue.shift();
    if (!videoId) {
      return;
    }

    this.#activeCount++;

    try {
      const originalTitle = await this.#titleGateway.fetchOriginalTitle(videoId);

      const subscribers = this.#cardSubscribers.get(videoId) || [];
      this.#cardSubscribers.delete(videoId);

      if (originalTitle) {
        for (const cardEl of subscribers) {
          if (cardEl && cardEl.isConnected) {
            this.#cardDomAdapter.updateCardTitle(cardEl, originalTitle);
          }
        }
      }
    } catch (err) {
      this.#logger.warn(`Erro ao processar card para ${videoId}:`, err);
    } finally {
      this.#pendingVideoIds.delete(videoId);
      this.#activeCount--;

      // Dispara o próximo item com espaçamento seguro (throttling)
      setTimeout(() => {
        this.#processNext();
      }, this.#intervalMs);
    }
  }

  /**
   * Retorna a quantidade de tarefas aguardando na fila.
   * @returns {number}
   */
  get queueLength() {
    return this.#queue.length;
  }

  /**
   * Retorna a quantidade de requisições ativas no momento.
   * @returns {number}
   */
  get activeCount() {
    return this.#activeCount;
  }

  /**
   * Limpa a fila e descarta tarefas pendentes.
   */
  clear() {
    this.#queue = [];
    this.#pendingVideoIds.clear();
    this.#cardSubscribers.clear();
  }
}

window.TitleQueueService = TitleQueueService;
