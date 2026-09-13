/**
 * @file DeepInspectionStrategy.js
 * @description Estratégia de resolução por varredura profunda de propriedades no objeto da faixa.
 */

class DeepInspectionStrategy {
  /**
   * Identificador legível da estratégia.
   * @returns {string}
   */
  getName() {
    return 'DeepInspectionStrategy (Camada 2)';
  }

  /**
   * Tenta identificar a faixa original varrendo recursivamente as propriedades do objeto.
   * 
   * @param {YouTubePlayerAdapter} playerAdapter - Instância do adapter do player
   * @param {Array<Object>} tracks - Faixas disponíveis no player
   * @returns {Object|null} Objeto da faixa original ou null se não encontrada
   */
  resolve(playerAdapter, tracks) {
    for (const track of tracks) {
      if (track.isOriginal === true) {
        return track;
      }

      try {
        const json = JSON.stringify(track);
        if (/original/i.test(json) || /"id":\s*"[^"]*orig[^"]*"/i.test(json)) {
          return track;
        }
      } catch (err) {
        // Ignora erros de serialização caso ocorram referências circulares
      }
    }

    return null;
  }
}

window.DeepInspectionStrategy = DeepInspectionStrategy;

