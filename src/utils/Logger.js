/**
 * @file Logger.js
 * @description Classe utilitária para padronização e centralização de logs do AntiDUB no console.
 * 
 * Responsabilidade:
 * - Encapsular a formatação dos prefixos globais e setoriais (`[AntiDUB][Áudio]` e `[AntiDUB][Título]`).
 * - Eliminar strings de prefixo hardcoded espalhadas pelas classes de domínio.
 * - Fornecer métodos de fábrica (Factory Methods) e métodos de conveniência para níveis de log (info, warn, error, debug).
 */

class Logger {
  #service;
  static #BASE_TAG = '[AntiDUB]';

  /**
   * @param {string} [service='Geral'] - Nome do subsistema/serviço (ex: 'Áudio', 'Título').
   */
  constructor(service = 'Geral') {
    this.#service = service;
  }

  /**
   * Factory method para criar um logger do subsistema de Áudio/Dublagem.
   * @returns {Logger}
   */
  static forAudio() {
    return new Logger('Áudio');
  }

  /**
   * Factory method para criar um logger do subsistema de Títulos.
   * @returns {Logger}
   */
  static forTitle() {
    return new Logger('Título');
  }

  /**
   * Monta o prefixo padronizado do logger.
   * @returns {string}
   */
  #formatPrefix() {
    return `${Logger.#BASE_TAG}[${this.#service}]`;
  }

  /**
   * Emite uma mensagem informativa no console.
   * @param {string} message 
   * @param {...any} args 
   */
  info(message, ...args) {
    console.log(`${this.#formatPrefix()} ${message}`, ...args);
  }

  /**
   * Emite uma mensagem de advertência no console.
   * @param {string} message 
   * @param {...any} args 
   */
  warn(message, ...args) {
    console.warn(`${this.#formatPrefix()} ${message}`, ...args);
  }

  /**
   * Emite uma mensagem de erro no console.
   * @param {string} message 
   * @param {...any} args 
   */
  error(message, ...args) {
    console.error(`${this.#formatPrefix()} ${message}`, ...args);
  }

  /**
   * Emite uma mensagem de depuração no console.
   * @param {string} message 
   * @param {...any} args 
   */
  debug(message, ...args) {
    console.debug(`${this.#formatPrefix()} ${message}`, ...args);
  }
}

window.Logger = Logger;
