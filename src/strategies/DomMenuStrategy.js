/**
 * @file DomMenuStrategy.js
 * @description Estratégia de resolução por inspeção dos elementos visuais do menu do player (.ytp-menuitem).
 */

class DomMenuStrategy {
  /**
   * Identificador legível da estratégia.
   * @returns {string}
   */
  getName() {
    return 'DomMenuStrategy (Camada 4)';
  }

  /**
   * Tenta identificar a faixa original correlacionando elementos de menu do DOM com as faixas do player.
   * 
   * @param {YouTubePlayerAdapter} playerAdapter - Instância do adapter do player
   * @param {Array<Object>} tracks - Faixas disponíveis no player
   * @returns {Object|null} Objeto da faixa original ou null se não encontrada
   */
  resolve(playerAdapter, tracks) {
    try {
      const menuItems = Array.from(
        document.querySelectorAll('.ytp-menuitem, .ytp-panel-menu .ytp-menuitem')
      );

      for (const item of menuItems) {
        const text = item.textContent || '';
        if (/original/i.test(text)) {
          const match = tracks.find((t) => {
            const name = t.displayName || t.name || t.label || '';
            return name && text.toLowerCase().includes(name.toLowerCase());
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

window.DomMenuStrategy = DomMenuStrategy;

