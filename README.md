# AntiDUB - Bloqueador de Dublagem por IA no YouTube

Extensão para Google Chrome (Manifest V3) desenvolvida em Programação Orientada a Objetos (POO) que define automaticamente a faixa de áudio original como padrão em todos os vídeos do YouTube, prevenindo a imposição de dublagens sintéticas de inteligência artificial.

## Estrutura de Pacotes e Arquitetura POO

O projeto é 100% orientado a objetos, seguindo o princípio de **uma classe por arquivo** (com o nome do arquivo exatamente igual ao da classe) e organizado em pacotes modulares sob o diretório `src/`:

```
AntiDUB_Chrome_Extension/
├── icons/
│   ├── icon-16.png, icon-32.png, icon-48.png, icon-128.png
├── src/
│   ├── adapters/
│   │   ├── TitleDomAdapter.js          # Adapter para localização e mutação do título no DOM
│   │   └── YouTubePlayerAdapter.js     # Adapter para API nativa do player (#movie_player)
│   ├── controllers/
│   │   └── AntiDubController.js        # Orquestrador do ciclo de vida SPA e comutação de áudio
│   ├── popup/
│   │   ├── popup.html                  # Interface do popup (Dark Mode)
│   │   ├── popup.css                   # Estilização compacta
│   │   └── PopupController.js          # Controlador de eventos e persistência da UI
│   ├── services/
│   │   ├── OEmbedGateway.js            # Gateway HTTP para a API oEmbed (títulos originais)
│   │   └── SettingsBridge.js           # Ponte de sincronização entre chrome.storage e DOM
│   └── strategies/
│       ├── AudioTrackResolver.js       # Orquestrador da cadeia de estratégias de áudio
│       ├── DeepInspectionStrategy.js   # Varredura recursiva de nós e strings
│       ├── DomMenuStrategy.js          # Varredura do menu de engrenagem no DOM
│       ├── EliminationStrategy.js      # Resolução reversa por exclusão de dublagens
│       └── MetadataStrategy.js         # Resolução via streamingData.adaptiveFormats
├── manifest.json                       # Manifesto da extensão (Manifest V3)
└── README.md
```

### Detalhamento dos Pacotes

#### `src/adapters/` (Adapter Pattern)
- [`YouTubePlayerAdapter.js`](src/adapters/YouTubePlayerAdapter.js): Abstrai e padroniza as chamadas ao `#movie_player` (`getAudioTrack`, `getAvailableAudioTracks`, `setAudioTrack`, `isAdShowing`).
- [`TitleDomAdapter.js`](src/adapters/TitleDomAdapter.js): Abstrai seletores de layout e mutações no DOM do YouTube para títulos (`h1`, `document.title` e meta tags).

#### `src/services/` (Comunicação e Integração)
- [`SettingsBridge.js`](src/services/SettingsBridge.js): Roda em `world: ISOLATED` e faz a ponte reativa entre `chrome.storage.local` e eventos do DOM.
- [`OEmbedGateway.js`](src/services/OEmbedGateway.js): Gateway Pattern que realiza chamadas assíncronas ao endpoint oEmbed com cache LRU em memória e controle de timeout.

#### `src/strategies/` (Strategy Pattern)
- [`AudioTrackResolver.js`](src/strategies/AudioTrackResolver.js): Contexto do Strategy Pattern que executa a cadeia de estratégias em cascata.
- [`MetadataStrategy.js`](src/strategies/MetadataStrategy.js): Resolução via metadados de streaming DASH.
- [`DeepInspectionStrategy.js`](src/strategies/DeepInspectionStrategy.js): Busca profunda em nós internos das faixas por "original".
- [`EliminationStrategy.js`](src/strategies/EliminationStrategy.js): Identificação reversa por descarte de faixas rotuladas como dublagem.
- [`DomMenuStrategy.js`](src/strategies/DomMenuStrategy.js): Inspeciona o menu de engrenagem (`.ytp-menuitem`) do player.

#### `src/controllers/` (Facade / Orquestração)
- [`AntiDubController.js`](src/controllers/AntiDubController.js): Gerencia o ciclo de vida da SPA (`yt-navigate-finish`), eventos de vídeo, suspensão em anúncios e acionamento da troca de áudio.

#### `src/popup/` (Interface do Usuário)
- [`PopupController.js`](src/popup/PopupController.js): Gerencia as preferências do usuário no painel popup.
- [`popup.html`](src/popup/popup.html) / [`popup.css`](src/popup/popup.css): Interface visual compacta no tema escuro oficial do YouTube.

## Como Instalar (Modo Desenvolvedor)

1. Abra o Google Chrome e navegue até `chrome://extensions`.
2. Ative a opção **Modo do desenvolvedor** no canto superior direito.
3. Clique no botão **Carregar sem compactação** (Load unpacked).
4. Selecione esta pasta raiz do projeto (`AntiDUB_Chrome_Extension`).
