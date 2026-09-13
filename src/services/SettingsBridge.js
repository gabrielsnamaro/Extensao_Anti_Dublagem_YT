/**
 * @file SettingsBridge.js
 * @description Módulo de ponte executado no contexto ISOLADO (Isolated World) sob arquitetura POO.
 * 
 * Responsabilidades:
 * - Acessar as APIs privilegiadas de extensão (ex: `chrome.storage.local`).
 * - Transmitir as configurações do usuário para o contexto principal da página (MAIN World).
 * - Reagir em tempo real a alterações feitas pelo popup (via `chrome.storage.onChanged`).
 */

class SettingsBridge {
  #storageKey;
  #eventName;
  #datasetAttr;

  /**
   * @param {string} [storageKey='antidub_enabled']
   * @param {string} [eventName='antidub:settings-changed']
   * @param {string} [datasetAttr='antidubEnabled']
   */
  constructor(
    storageKey = 'antidub_enabled',
    eventName = 'antidub:settings-changed',
    datasetAttr = 'antidubEnabled'
  ) {
    this.#storageKey = storageKey;
    this.#eventName = eventName;
    this.#datasetAttr = datasetAttr;
  }

  /**
   * Propaga o estado de ativação da extensão para o DOM e emite um CustomEvent
   * para notificar scripts em execução no contexto MAIN.
   * 
   * @param {boolean} isEnabled
   */
  syncStateToDOM(isEnabled) {
    if (document.documentElement) {
      document.documentElement.dataset[this.#datasetAttr] = isEnabled ? 'true' : 'false';
    }

    window.dispatchEvent(
      new CustomEvent(this.#eventName, {
        detail: { enabled: isEnabled }
      })
    );
  }

  /**
   * Inicializa a leitura das configurações do storage e registra o ouvinte de alterações.
   */
  init() {
    chrome.storage.local.get({ [this.#storageKey]: true }, (result) => {
      const isEnabled = result[this.#storageKey] ?? true;
      this.syncStateToDOM(isEnabled);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[this.#storageKey]) {
        const isEnabled = changes[this.#storageKey].newValue ?? true;
        this.syncStateToDOM(isEnabled);
      }
    });
  }
}

// Instanciação e execução imediata no Isolated World
const settingsBridge = new SettingsBridge();
settingsBridge.init();

