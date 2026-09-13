/**
 * @file EliminationStrategy.js
 * @description Estratégia de resolução reversa por eliminação de faixas rotuladas como dublagem.
 */

class EliminationStrategy {
  /**
   * Identificador legível da estratégia.
   * @returns {string}
   */
  getName() {
    return 'EliminationStrategy (Camada 3)';
  }

  /**
   * Tenta identificar a faixa original descartando faixas que contenham termos de dublagem.
   * 
   * @param {YouTubePlayerAdapter} playerAdapter - Instância do adapter do player
   * @param {Array<Object>} tracks - Faixas disponíveis no player
   * @returns {Object|null} Objeto da faixa original ou null se não encontrada
   */
  resolve(playerAdapter, tracks) {
    if (!Array.isArray(tracks) || tracks.length < 2) {
      return null;
    }

    const isDubbed = (t) => {
      try {
        const s = typeof t === 'string' ? t : JSON.stringify(t);
        return /dublad|dubbed|gerad[oa]|auto-generat/i.test(s);
      } catch (err) {
        return false;
      }
    };

    const nonDubbedTracks = tracks.filter((t) => !isDubbed(t));

    if (nonDubbedTracks.length === 1) {
      return nonDubbedTracks[0];
    }

    return null;
  }
}

window.EliminationStrategy = EliminationStrategy;

