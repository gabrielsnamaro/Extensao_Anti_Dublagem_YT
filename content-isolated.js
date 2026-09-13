/**
 * @file content-isolated.js
 * @description Módulo de ponte executado no contexto ISOLADO (Isolated World).
 * 
 * Responsabilidade:
 * - Acessar as APIs privilegiadas de extensão (ex: `chrome.storage.local`).
 * - Transmitir as configurações do usuário para o contexto principal da página (MAIN World),
 *   onde o player do YouTube está ativo.
 * - Reagir em tempo real a alterações feitas pelo popup (via `chrome.storage.onChanged`).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'antidub_enabled';
  const EVENT_NAME = 'antidub:settings-changed';
  const DATASET_ATTR = 'antidubEnabled';

  /**
   * Propaga o estado de ativação da extensão para o DOM e emite um CustomEvent
   * para notificar scripts em execução no contexto MAIN.
   * 
   * @param {boolean} isEnabled - Se a extensão deve forçar o áudio original.
   */
  function syncStateToDOM(isEnabled) {
    // Grava no elemento raiz para leitura síncrona inicial
    if (document.documentElement) {
      document.documentElement.dataset[DATASET_ATTR] = isEnabled ? 'true' : 'false';
    }

    // Dispara evento para comunicação em tempo real com o contexto MAIN
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: { enabled: isEnabled }
      })
    );
  }

  /**
   * Inicializa o estado lendo as configurações persistidas no chrome.storage.local.
   * O padrão adotado é `true` (extensão ativada).
   */
  function initializeSettings() {
    chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
      const isEnabled = result[STORAGE_KEY] ?? true;
      syncStateToDOM(isEnabled);
    });
  }

  /**
   * Monitora alterações nas preferências do usuário em tempo real.
   * Quando o usuário alterna o switch no popup, esta função é acionada.
   */
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      const isEnabled = changes[STORAGE_KEY].newValue ?? true;
      syncStateToDOM(isEnabled);
    }
  });

  // Execução inicial
  initializeSettings();
})();

