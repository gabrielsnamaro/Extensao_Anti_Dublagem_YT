/**
 * @file AudioTrackResolver.js
 * @description Orquestrador de estratégias de identificação da faixa original de áudio (Strategy Pattern).
 */

class AudioTrackResolver {
  #strategies = [];

  /**
   * Inicializa o resolvedor registrando a lista padrão de estratégias.
   * @param {Array<Object>} [customStrategies=null]
   */
  constructor(customStrategies = null) {
    if (Array.isArray(customStrategies)) {
      this.#strategies = customStrategies;
    } else {
      this.#strategies = [
        new window.MetadataStrategy(),
        new window.DeepInspectionStrategy(),
        new window.EliminationStrategy(),
        new window.DomMenuStrategy()
      ];
    }
  }

  /**
   * Adiciona uma nova estratégia à fila de resolução.
   * @param {Object} strategy - Objeto com métodos getName() e resolve(playerAdapter, tracks)
   */
  addStrategy(strategy) {
    if (strategy && typeof strategy.resolve === 'function') {
      this.#strategies.push(strategy);
    }
  }

  /**
   * Executa as estratégias sequencialmente até que uma delas identifique a faixa original.
   * 
   * @param {YouTubePlayerAdapter} playerAdapter - Instância do adapter do player
   * @param {Array<Object>} tracks - Lista de faixas disponíveis
   * @returns {{track: Object, strategyName: string}|null} Resultado ou null se nenhuma estratégia encontrar
   */
  resolve(playerAdapter, tracks) {
    for (const strategy of this.#strategies) {
      try {
        const track = strategy.resolve(playerAdapter, tracks);
        if (track) {
          return {
            track,
            strategyName: typeof strategy.getName === 'function' ? strategy.getName() : strategy.constructor.name
          };
        }
      } catch (err) {
        console.warn(`[AntiDUB] Falha ao executar estratégia ${strategy.constructor.name}:`, err);
      }
    }

    return null;
  }
}

window.AudioTrackResolver = AudioTrackResolver;

