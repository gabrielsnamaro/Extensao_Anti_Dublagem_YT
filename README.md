# AntiDUB - Bloqueador de Dublagem por IA no YouTube

Extensão para Google Chrome (Manifest V3) que define automaticamente a faixa de áudio original como padrão em todos os vídeos do YouTube, prevenindo a imposição de dublagens sintéticas de inteligência artificial.

## Como Funciona

1. **Execução Automática**: Ao carregar um vídeo ou navegar dentro do YouTube (`yt-navigate-finish`), o módulo [`content-main.js`](content-main.js) é acionado no contexto principal da página (`world: MAIN`).
2. **Identificação da Faixa Original**: Consulta as faixas do player nativo do YouTube (`#movie_player.getAvailableAudioTracks()`) e detecta a faixa original por meio de múltiplos critérios (`isOriginal`, IDs técnicos como `orig`, ou descrições no rótulo).
3. **Alternância Instantânea**: Caso o vídeo tenha iniciado com dublagem automática, a extensão comuta imediatamente para o áudio original (`#movie_player.setAudioTrack()`), sem recarregar o vídeo.
4. **Painel de Controle (Popup)**: Permite ao usuário pausar ou reativar o bloqueio a qualquer momento através do ícone da extensão, com preferência persistida no `chrome.storage.local`.

## Estrutura do Projeto

- `manifest.json`: Definição de permissões, ícones, popup e content scripts.
- `content-isolated.js`: Executado no contexto isolado para ler e sincronizar as configurações do usuário (`chrome.storage.local`).
- `content-main.js`: Executado no contexto principal da página com acesso direto à API do player do YouTube.
- `popup.html`, `popup.css`, `popup.js`: Interface do painel de controle com switch liga/desliga.
- `icons/`: Ícones da extensão nas resoluções 16x16, 32x32, 48x48 e 128x128.

## Como Instalar (Modo Desenvolvedor)

1. Abra o Google Chrome e navegue até `chrome://extensions`.
2. Ative a opção **Modo do desenvolvedor** no canto superior direito.
3. Clique no botão **Carregar sem compactação** (Load unpacked).
4. Selecione esta pasta raiz do projeto (`AntiDUB_Chrome_Extension`).
