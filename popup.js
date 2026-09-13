/**
 * @file popup.js
 * @description Módulo de controle da interface visual (Popup) da extensão AntiDUB.
 * 
 * Responsabilidade:
 * - Carregar o estado atual salvo pelo usuário no `chrome.storage.local`.
 * - Sincronizar os elementos visuais (checkbox switch e texto explicativo).
 * - Salvar alterações em tempo real quando o usuário ligar ou desligar a extensão.
 */

const STORAGE_KEY = 'antidub_enabled';

// Elementos do DOM
const toggleCheckbox = document.getElementById('toggle-enabled');
const statusDesc = document.getElementById('status-desc');

/**
 * Atualiza os textos da interface de acordo com o estado do toggle.
 * 
 * @param {boolean} isEnabled - Se a extensão está ativa ou desativada.
 */
function updateUiState(isEnabled) {
  if (isEnabled) {
    statusDesc.textContent = 'Forçando áudio original nos vídeos do YouTube.';
    statusDesc.classList.remove('disabled');
  } else {
    statusDesc.textContent = 'Pausado: dublagens do YouTube não serão alteradas.';
    statusDesc.classList.add('disabled');
  }
}

/**
 * Inicializa os valores do popup carregando as preferências do storage local.
 */
function initPopup() {
  chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
    const isEnabled = result[STORAGE_KEY] ?? true;
    toggleCheckbox.checked = isEnabled;
    updateUiState(isEnabled);
  });
}

/**
 * Listener acionado ao clicar no switch de ligar/desligar.
 * Persiste a nova preferência no storage e atualiza os textos da interface.
 */
toggleCheckbox.addEventListener('change', () => {
  const isEnabled = toggleCheckbox.checked;
  
  chrome.storage.local.set({ [STORAGE_KEY]: isEnabled }, () => {
    updateUiState(isEnabled);
  });
});

// Inicializa o popup assim que a janela for carregada
document.addEventListener('DOMContentLoaded', initPopup);