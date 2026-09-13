/**
 * @file MetadataStrategy.js
 * @description Estratégia de resolução de faixa original via metadados oficiais do streaming DASH.
 */

class MetadataStrategy {
  /**
   * Identificador legível da estratégia.
   * @returns {string}
   */
  getName() {
    return 'MetadataStrategy (Camada 1)';
  }

  /**
   * Tenta identificar a faixa original consultando `streamingData.adaptiveFormats`.
   * 
   * @param {YouTubePlayerAdapter} playerAdapter - Instância do adapter do player
   * @param {Array<Object>} tracks - Faixas disponíveis no player
   * @returns {Object|null} Objeto da faixa original ou null se não encontrada
   */
  resolve(playerAdapter, tracks) {
    try {
      const playerResponse = playerAdapter.getPlayerResponse();
      const adaptiveFormats = playerResponse?.streamingData?.adaptiveFormats;

      if (!Array.isArray(adaptiveFormats)) {
        return null;
      }

      for (const fmt of adaptiveFormats) {
        const aTrack = fmt.audioTrack;
        if (!aTrack) continue;

        const dName = aTrack.displayName || '';
        const tId = aTrack.id || '';

        if (/original/i.test(dName) || /orig/i.test(tId)) {
          const match = tracks.find((t) => {
            const tid = playerAdapter.getTrackId(t);
            return tid === tId || (tId && tid && tid.startsWith(tId.split('.')[0]));
          });

          if (match) {
            return match;
          }
        }
      }
    } catch (err) {
      if (window.Logger) {
        window.Logger.forAudio().warn(`Erro na ${this.getName()}:`, err);
      } else {
        console.warn(`[AntiDUB][Áudio] Erro na ${this.getName()}:`, err);
      }
    }

    return null;
  }
}

window.MetadataStrategy = MetadataStrategy;

