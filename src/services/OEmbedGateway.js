/**
 * @file OEmbedGateway.js
 * @description Gateway Pattern para encapsular chamadas de rede externas à API oEmbed do YouTube.
 * 
 * Responsabilidade:
 * - Realizar requisições HTTP assíncronas para o endpoint oEmbed do YouTube.
 * - Tratar erros de rede, respostas não-200 e timeouts com AbortController.
 * - Fornecer cache em memória (LRU simples) para evitar requisições redundantes durante navegação.
 */

class OEmbedGateway {
  #cache;
  #maxCacheSize;
  #timeoutMs;

  /**
   * @param {Object} [config={}]
   * @param {number} [config.timeoutMs=5000] - Tempo limite em milissegundos para a requisição.
   * @param {number} [config.maxCacheSize=100] - Limite máximo de entradas no cache em memória.
   */
  constructor({ timeoutMs = 5000, maxCacheSize = 100 } = {}) {
    this.#cache = new Map();
    this.#timeoutMs = timeoutMs;
    this.#maxCacheSize = maxCacheSize;
  }

  /**
   * Monta a URL de consulta ao endpoint oEmbed do YouTube.
   * 
   * @param {string} videoId - Identificador único do vídeo no YouTube.
   * @returns {string} URL formatada para consulta JSON.
   */
  #buildUrl(videoId) {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  }

  /**
   * Armazena um título no cache em memória respeitando o limite máximo.
   * 
   * @param {string} videoId 
   * @param {string} title 
   */
  #saveToCache(videoId, title) {
    if (this.#cache.size >= this.#maxCacheSize) {
      // Remove a chave mais antiga inserida (política FIFO/LRU simples)
      const oldestKey = this.#cache.keys().next().value;
      this.#cache.delete(oldestKey);
    }
    this.#cache.set(videoId, title);
  }

  /**
   * Obtém o título original de um vídeo a partir do seu videoId via oEmbed.
   * 
   * @param {string} videoId - ID do vídeo (ex: 'dQw4w9WgXcQ')
   * @returns {Promise<string|null>} Retorna o título original ou null em caso de falha.
   */
  async fetchOriginalTitle(videoId) {
    if (!videoId || typeof videoId !== 'string') {
      return null;
    }

    const cleanVideoId = videoId.trim();

    // 1. Verificação de Cache em Memória
    if (this.#cache.has(cleanVideoId)) {
      return this.#cache.get(cleanVideoId);
    }

    // 2. Configuração de Timeout e AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const url = this.#buildUrl(cleanVideoId);
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`[AntiDUB][OEmbedGateway] Falha ao consultar oEmbed para ${cleanVideoId}: status ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data && typeof data.title === 'string' && data.title.trim().length > 0) {
        const originalTitle = data.title.trim();
        this.#saveToCache(cleanVideoId, originalTitle);
        return originalTitle;
      }

      return null;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[AntiDUB][OEmbedGateway] Timeout (${this.#timeoutMs}ms) ao consultar oEmbed para ${cleanVideoId}`);
      } else {
        console.warn(`[AntiDUB][OEmbedGateway] Erro de rede ao consultar oEmbed para ${cleanVideoId}:`, err);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Limpa todo o cache em memória de títulos consultados.
   */
  clearCache() {
    this.#cache.clear();
  }

  /**
   * Retorna a quantidade de títulos armazenados no cache.
   * @returns {number}
   */
  get cacheSize() {
    return this.#cache.size;
  }
}

window.OEmbedGateway = OEmbedGateway;

