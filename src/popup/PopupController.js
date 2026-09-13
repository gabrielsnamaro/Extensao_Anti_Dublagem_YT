/**
 * @file PopupController.js
 * @description Controlador da interface visual (Popup) da extensão AntiDUB sob arquitetura POO.
 * 
 * Responsabilidades:
 * - Carregar o estado persistido do usuário no `chrome.storage.local`.
 * - Sincronizar os elementos visuais (checkbox switch e texto explicativo).
 * - Persistir alterações em tempo real quando o usuário ligar ou desligar a extensão.
 */

class PopupController {
  #storageKey;
  #toggleCheckbox;
  #statusDesc;

  /**
   * @param {string} [storageKey='antidub_enabled']
   * @param {string} [toggleCheckboxId='toggle-enabled']
   * @param {string} [statusDescId='status-desc']
   */
  constructor(
    storageKey = 'antidub_enabled',
    toggleCheckboxId = 'toggle-enabled',
    statusDescId = 'status-desc'
  ) {
    this.#storageKey = storageKey;
    this.#toggleCheckbox = document.getElementById(toggleCheckboxId);
    this.#statusDesc = document.getElementById(statusDescId);
  }

  /**
   * Atualiza os textos da interface de acordo com o estado do toggle.
   * @param {boolean} isEnabled
   */
  updateUi(isEnabled) {
    if (!this.#statusDesc) return;

    if (isEnabled) {
      this.#statusDesc.textContent = 'Forçando áudio original nos vídeos do YouTube.';
      this.#statusDesc.classList.remove('disabled');
    } else {
      this.#statusDesc.textContent = 'Pausado: dublagens do YouTube não serão alteradas.';
      this.#statusDesc.classList.add('disabled');
    }
  }

  /**
   * Inicializa o popup vinculando eventos e carregando dados do storage.
   */
  init() {
    if (!this.#toggleCheckbox) return;

    chrome.storage.local.get({ [this.#storageKey]: true }, (result) => {
      const isEnabled = result[this.#storageKey] ?? true;
      this.#toggleCheckbox.checked = isEnabled;
      this.updateUi(isEnabled);
    });

    this.#toggleCheckbox.addEventListener('change', () => {
      const isEnabled = this.#toggleCheckbox.checked;
      chrome.storage.local.set({ [this.#storageKey]: isEnabled }, () => {
        this.updateUi(isEnabled);
      });
    });
  }
}

// Inicializa a classe assim que a janela do popup for carregada
document.addEventListener('DOMContentLoaded', () => {
  const popupController = new PopupController();
  popupController.init();
});

