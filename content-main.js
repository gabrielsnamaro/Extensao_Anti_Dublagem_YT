/**
 * @file content-main.js
 * @description Módulo principal executado diretamente no contexto da página (MAIN World).
 * 
 * Responsabilidades:
 * - Acessar diretamente o elemento `#movie_player` e suas APIs nativas (`getAvailableAudioTracks`, `setAudioTrack`).
 * - Detectar transições de SPA do YouTube (`yt-navigate-finish`) e reprodução de vídeo (`play`/`playing`).
 * - Tratar e ignorar períodos de anúncios (pre-roll ads) para não abortar a verificação antes do vídeo principal.
 * - Identificar a faixa de áudio original através de uma estratégia em 4 camadas:
 *     1. Metadados oficiais do streaming DASH (`player.getPlayerResponse()`).
 *     2. Varredura profunda de propriedades do objeto da faixa (`JSON.stringify`).
 *     3. Heurística reversa por eliminação (descartar faixas rotuladas como "dublado/dubbed").
 *     4. Análise dos elementos de seletor no DOM do player (`.ytp-menuitem`).
 * - Comutar de forma transparente e segura para a faixa original via `setAudioTrack`.
 */

(function () {
  'use strict';

  const LOG_PREFIX = '[AntiDUB]';
  const EVENT_SETTINGS_CHANGED = 'antidub:settings-changed';
  const DATASET_ATTR = 'antidubEnabled';

  console.log(`${LOG_PREFIX} Módulo content-main.js inicializado com sucesso.`);

  // Estado interno da extensão
  let isEnabled = document.documentElement?.dataset?.[DATASET_ATTR] !== 'false';
  let currentVideoId = null;
  let retryIntervalId = null;
  let isProcessing = false;

  /**
   * Obtém a instância do player HTML5 do YouTube presente no DOM.
   * 
   * @returns {HTMLElement|null} Elemento #movie_player ou null se não encontrado.
   */
  function getPlayer() {
    return document.getElementById('movie_player');
  }

  /**
   * Verifica se o player está atualmente reproduzindo um anúncio (Pre-roll ou Mid-roll).
   * Durante anúncios, a contagem de faixas não deve abortar o monitoramento.
   * 
   * @param {HTMLElement} player - Instância do #movie_player
   * @returns {boolean} True se houver anúncio ativo.
   */
  function isAdShowing(player) {
    if (!player) return false;
    return (
      player.classList?.contains('ad-showing') ||
      player.classList?.contains('ad-interrupting') ||
      player.hasAttribute?.('ad-showing') ||
      (typeof player.isAd === 'function' && player.isAd())
    );
  }

  /**
   * Extrai o identificador único do vídeo da URL atual.
   * 
   * @returns {string|null} ID do vídeo ou null.
   */
  function getVideoIdFromUrl() {
    const url = new URL(window.location.href);
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }
    const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) {
      return shortsMatch[1];
    }
    return null;
  }

  /**
   * Extrai o identificador (ID) de um objeto de faixa de forma segura,
   * suportando formatos de string direta ou objetos estruturados.
   * 
   * @param {Object|string|null} track
   * @returns {string|null}
   */
  function getTrackId(track) {
    if (!track) return null;
    if (typeof track === 'string') return track;
    return track.id || track.audioTrackId || null;
  }

  /**
   * Camada 1: Identificação da faixa original via metadados de streaming do player.
   * Consulta `streamingData.adaptiveFormats` que declara o `audioTrack` oficial.
   * 
   * @param {HTMLElement} player
   * @param {Array<Object>} tracks
   * @returns {Object|null}
   */
  function findFromMetadata(player, tracks) {
    try {
      const playerResponse =
        typeof player.getPlayerResponse === 'function'
          ? player.getPlayerResponse()
          : window.ytInitialPlayerResponse;

      const adaptiveFormats = playerResponse?.streamingData?.adaptiveFormats;
      if (Array.isArray(adaptiveFormats)) {
        for (const fmt of adaptiveFormats) {
          const aTrack = fmt.audioTrack;
          if (aTrack) {
            const dName = aTrack.displayName || '';
            const tId = aTrack.id || '';
            if (/original/i.test(dName) || /orig/i.test(tId)) {
              // Localiza no array do player a faixa com o mesmo ID ou prefixo de idioma
              const match = tracks.find((t) => {
                const tid = getTrackId(t);
                return tid === tId || (tId && tid && tid.startsWith(tId.split('.')[0]));
              });
              if (match) {
                return { track: match, layer: 'Camada 1 (Metadata/streamingData)', raw: aTrack };
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Erro ao consultar metadata do player:`, err);
    }
    return null;
  }

  /**
   * Camada 2: Varredura profunda em todas as propriedades das faixas disponíveis.
   * Converte cada objeto em JSON para encontrar menções a "original" ou "orig".
   * 
   * @param {Array<Object>} tracks
   * @returns {Object|null}
   */
  function findFromDeepProperties(tracks) {
    for (const track of tracks) {
      if (track.isOriginal === true) {
        return { track, layer: 'Camada 2 (isOriginal: true)' };
      }
      try {
        const json = JSON.stringify(track);
        if (/original/i.test(json) || /"id":\s*"[^"]*orig[^"]*"/i.test(json)) {
          return { track, layer: 'Camada 2 (Deep Properties JSON)' };
        }
      } catch (err) {
        // Ignora erros de circularidade caso ocorram
      }
    }
    return null;
  }

  /**
   * Camada 3: Identificação por eliminação.
   * Se houver faixas explicitamente marcadas como dublagem ("dublado", "dubbed", "gerado"),
   * a faixa que não possui essa marcação é selecionada como original.
   * 
   * @param {Array<Object>} tracks
   * @returns {Object|null}
   */
  function findByElimination(tracks) {
    if (tracks.length < 2) return null;

    const isDubbed = (t) => {
      try {
        const s = typeof t === 'string' ? t : JSON.stringify(t);
        return /dublad|dubbed|gerad[oa]|auto-generat/i.test(s);
      } catch (err) {
        return false;
      }
    };

    const nonDubbed = tracks.filter((t) => !isDubbed(t));
    if (nonDubbed.length === 1) {
      return { track: nonDubbed[0], layer: 'Camada 3 (Eliminação de dublagem)' };
    }
    return null;
  }

  /**
   * Camada 4: Inspeção no DOM dos elementos do menu de configurações (.ytp-menuitem).
   * 
   * @param {Array<Object>} tracks
   * @returns {Object|null}
   */
  function findFromDomMenu(tracks) {
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
            return { track: match, layer: 'Camada 4 (DOM Menu matching)' };
          }
        }
      }
    } catch (err) {
      // Ignora erros de consulta DOM
    }
    return null;
  }

  /**
   * Executa a estratégia multi-camadas para encontrar a faixa original.
   * 
   * @param {HTMLElement} player
   * @param {Array<Object>} tracks
   * @returns {{track: Object, layer: string}|null}
   */
  function resolveOriginalAudioTrack(player, tracks) {
    return (
      findFromMetadata(player, tracks) ||
      findFromDeepProperties(tracks) ||
      findByElimination(tracks) ||
      findFromDomMenu(tracks)
    );
  }

  /**
   * Limpa qualquer rotina de retentativa/polling que esteja em execução.
   */
  function clearPendingRetries() {
    if (retryIntervalId !== null) {
      clearInterval(retryIntervalId);
      retryIntervalId = null;
    }
    isProcessing = false;
  }

  /**
   * Aplica a troca para a faixa original de áudio com mecanismo de polling resiliente.
   */
  function enforceOriginalAudio() {
    clearPendingRetries();

    if (!isEnabled) {
      console.log(`${LOG_PREFIX} Extensão desativada nas preferências. Nenhuma alteração feita.`);
      return;
    }

    let attempts = 0;
    const maxAttempts = 30; // 30 tentativas * 250ms = 7.5 segundos
    isProcessing = true;

    retryIntervalId = setInterval(() => {
      attempts++;
      const player = getPlayer();

      if (!player || typeof player.getAvailableAudioTracks !== 'function') {
        if (attempts >= maxAttempts) {
          clearPendingRetries();
        }
        return;
      }

      // Se um anúncio estiver rodando, não desiste; aguarda o anúncio terminar
      if (isAdShowing(player)) {
        console.log(`${LOG_PREFIX} Anúncio em reprodução. Aguardando vídeo principal... (${attempts}/${maxAttempts})`);
        return;
      }

      let tracks = null;
      try {
        tracks = player.getAvailableAudioTracks();
      } catch (err) {
        console.warn(`${LOG_PREFIX} Erro ao buscar faixas de áudio:`, err);
      }

      // Aguarda o carregamento das faixas DASH
      if (!Array.isArray(tracks) || tracks.length === 0) {
        if (attempts >= maxAttempts) {
          clearPendingRetries();
        }
        return;
      }

      // Se só houver 1 faixa e não estiver em anúncio, é o áudio único do vídeo
      if (tracks.length === 1) {
        console.log(`${LOG_PREFIX} Vídeo possui apenas 1 faixa disponível. Nenhuma ação necessária.`);
        clearPendingRetries();
        return;
      }

      // Log detalhado das faixas para rastreamento
      console.log(`${LOG_PREFIX} ${tracks.length} faixas detectadas:`, tracks);

      // Resolve a faixa original através da estratégia multi-camadas
      const resolution = resolveOriginalAudioTrack(player, tracks);

      if (!resolution || !resolution.track) {
        if (attempts < maxAttempts) {
          // Pode ser que os metadados ainda estejam em carregamento
          return;
        }
        console.warn(`${LOG_PREFIX} Nenhuma faixa identificada como original após ${attempts} tentativas. Faixas disponíveis:`, tracks);
        clearPendingRetries();
        return;
      }

      const originalTrack = resolution.track;
      const originalTrackId = getTrackId(originalTrack);
      const currentTrack = typeof player.getAudioTrack === 'function' ? player.getAudioTrack() : null;
      const currentTrackId = getTrackId(currentTrack);

      console.log(
        `${LOG_PREFIX} Faixa original identificada via ${resolution.layer}: "${originalTrack.displayName || originalTrackId}".`
      );

      // Se a faixa ativa já for a original, finaliza com sucesso
      if (currentTrackId && originalTrackId && currentTrackId === originalTrackId) {
        console.log(`${LOG_PREFIX} Faixa atual já é a original (${currentTrackId}). Nenhuma alteração necessária.`);
        clearPendingRetries();
        return;
      }

      // Efetua a troca para a faixa original
      try {
        console.log(
          `${LOG_PREFIX} Dublagem ativa ("${currentTrack?.displayName || currentTrackId || 'Desconhecida'}"). Trocando para original: "${originalTrack.displayName || originalTrackId}"...`
        );

        player.setAudioTrack(originalTrack);
      } catch (err1) {
        console.warn(`${LOG_PREFIX} Falha ao passar objeto da faixa. Tentando com ID direto:`, err1);
        try {
          if (originalTrackId) {
            player.setAudioTrack(originalTrackId);
          }
        } catch (err2) {
          console.error(`${LOG_PREFIX} Erro fatal ao configurar faixa de áudio:`, err2);
        }
      }

      clearPendingRetries();
    }, 250);
  }

  /**
   * Manipulador para quando a navegação para um novo vídeo for concluída (SPA).
   */
  function handleNavigation() {
    const newVideoId = getVideoIdFromUrl();
    if (!newVideoId) {
      clearPendingRetries();
      currentVideoId = null;
      return;
    }

    currentVideoId = newVideoId;
    enforceOriginalAudio();
  }

  /**
   * Listener para quando as configurações do usuário forem alteradas no popup.
   */
  window.addEventListener(EVENT_SETTINGS_CHANGED, (event) => {
    const wasEnabled = isEnabled;
    isEnabled = Boolean(event.detail?.enabled);

    console.log(`${LOG_PREFIX} Estado alterado para: ${isEnabled ? 'ATIVADO' : 'DESATIVADO'}.`);

    if (!wasEnabled && isEnabled && getVideoIdFromUrl()) {
      enforceOriginalAudio();
    }
  });

  // Gatilho 1: Navegações SPA do YouTube
  window.addEventListener('yt-navigate-finish', handleNavigation);

  // Gatilho 2: Início ou retomada de reprodução no elemento <video>
  document.addEventListener(
    'play',
    (event) => {
      if (event.target && event.target.tagName === 'VIDEO') {
        enforceOriginalAudio();
      }
    },
    true
  );

  // Gatilho 3: Carregamento direto da página (F5 ou abertura inicial da URL)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    handleNavigation();
  } else {
    window.addEventListener('DOMContentLoaded', handleNavigation);
  }
})();
