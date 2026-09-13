/**
 * @file CachedTitleGateway.js
 * @description Proxy Pattern (Cache Proxy) para controle de cache em memória das consultas de títulos originais.
 * 
 * Responsabilidade:
 * - Implementar a mesma interface pública do gateway de títulos (`fetchOriginalTitle`).
 * - Interceptar requisições e verificar se o título do `videoId` já se encontra em cache.
 * - Delegar a requisição de rede para o gateway subjacente (ex: OEmbedGateway) apenas em caso de cache miss.
 * - Gerenciar políticas de tamanho e limpeza de memória do cache (LRU simples).
 */

class CachedTitleGateway {
  #gateway;
  #cache;
  #maxCacheSize;

  /**
   * @param {Object} [gateway=null] - Instância de gateway responsável pela busca externa.
   * @param {Object} [options={}]
   * @param {number} [options.maxCacheSize=150] - Número máximo de títulos mantidos em memória.
   */
  constructor(gateway = null, { maxCacheSize = 150 } = {}) {
    this.#gateway = gateway || new window.OEmbedGateway();
    this.#cache = new Map();
    this.#maxCacheSize = maxCacheSize;
  }

  /**
   * Obtém o título original do vídeo. Se presente em cache, retorna imediatamente sem chamadas de rede.
   * Caso contrário, delega ao gateway real e armazena o resultado.
   * 
   * @param {string} videoId - Identificador único do vídeo no YouTube.
   * @returns {Promise<string|null>}
   */
  async fetchOriginalTitle(videoId) {
    if (!videoId || typeof videoId !== 'string') {
      return null;
    }

    const cleanVideoId = videoId.trim();

    // 1. Verificação no Cache (Cache Hit)
    if (this.#cache.has(cleanVideoId)) {
      return this.#cache.get(cleanVideoId);
    }

    // 2. Delegação ao Gateway Real (Cache Miss)
    const title = await this.#gateway.fetchOriginalTitle(cleanVideoId);

    // 3. Armazenamento no Cache
    if (title && typeof title === 'string' && title.trim().length > 0) {
      this.#saveToCache(cleanVideoId, title.trim());
      return title.trim();
    }

    return null;
  }

  /**
   * Salva uma entrada no cache respeitando a política de capacidade máxima (FIFO/LRU simples).
   * 
   * @param {string} videoId 
   * @param {string} title 
   */
  #saveToCache(videoId, title) {
    if (this.#cache.size >= this.#maxCacheSize) {
      const oldestKey = this.#cache.keys().next().value;
      this.#cache.delete(oldestKey);
    }
    this.#cache.set(videoId, title);
  }

  /**
   * Verifica se o videoId já está armazenado no cache.
   * 
   * @param {string} videoId 
   * @returns {boolean}
   */
  has(videoId) {
    return this.#cache.has(videoId?.trim());
  }

  /**
   * Retorna o título armazenado em cache para o videoId informado ou null.
   * 
   * @param {string} videoId 
   * @returns {string|null}
   */
  get(videoId) {
    return this.#cache.get(videoId?.trim()) || null;
  }

  /**
   * Limpa todo o cache em memória.
   */
  clearCache() {
    this.#cache.clear();
  }

  /**
   * Retorna a quantidade de entradas atualmente em cache.
   * @returns {number}
   */
  get cacheSize() {
    return this.#cache.size;
  }
}

window.CachedTitleGateway = CachedTitleGateway;
