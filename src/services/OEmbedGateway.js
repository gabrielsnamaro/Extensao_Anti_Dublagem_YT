/**
 * @file OEmbedGateway.js
 * @description Gateway Pattern para encapsular chamadas de rede externas à API oEmbed do YouTube.
 * 
 * Responsabilidade:
 * - Realizar requisições HTTP assíncronas para o endpoint oEmbed do YouTube.
 * - Tratar erros de rede, respostas HTTP não-200 e timeouts via AbortController.
 * - Fazer o parse e sanitização do título original retornado no payload JSON.
 */

class OEmbedGateway {
  #timeoutMs;

  /**
   * @param {Object} [config={}]
   * @param {number} [config.timeoutMs=5000] - Tempo limite em milissegundos para a requisição.
   */
  constructor({ timeoutMs = 5000 } = {}) {
    this.#timeoutMs = timeoutMs;
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
   * Obtém o título original de um vídeo a partir do seu videoId via requisição oEmbed.
   * 
   * @param {string} videoId - ID do vídeo (ex: 'dQw4w9WgXcQ')
   * @returns {Promise<string|null>} Retorna o título original limpo ou null em caso de falha.
   */
  async fetchOriginalTitle(videoId) {
    if (!videoId || typeof videoId !== 'string') {
      return null;
    }

    const cleanVideoId = videoId.trim();

    // Configuração de Timeout e AbortController
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
        return data.title.trim();
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
}

window.OEmbedGateway = OEmbedGateway;
