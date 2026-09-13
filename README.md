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
│   │   ├── TitleDomAdapter.js          # Adapter para localização e mutação do título do vídeo em reprodução
│   │   ├── VideoCardDomAdapter.js      # Adapter para localização, extração e mutação de cards de vídeos listados
│   │   └── YouTubePlayerAdapter.js     # Adapter para API nativa do player (#movie_player)
│   ├── controllers/
│   │   ├── AntiDubController.js        # Orquestrador do ciclo de vida SPA e comutação de áudio
│   │   ├── ListTitleController.js      # Orquestrador de lazy loading (IntersectionObserver) para vídeos listados
│   │   └── TitleController.js          # Orquestrador da restauração do título original na watch page
│   ├── popup/
│   │   ├── popup.html                  # Interface do popup (Dark Mode)
│   │   ├── popup.css                   # Estilização compacta
│   │   └── PopupController.js          # Controlador de eventos e persistência da UI
│   ├── services/
│   │   ├── CachedTitleGateway.js       # Proxy Pattern (Cache em memória) para títulos
│   │   ├── OEmbedGateway.js            # Gateway HTTP para a API oEmbed (títulos originais)
│   │   ├── SettingsBridge.js           # Ponte de sincronização entre chrome.storage e DOM
│   │   └── TitleQueueService.js        # Fila controlada (Producer-Consumer/Rate Limiting) para requisições
│   ├── strategies/
│   │   ├── AudioTrackResolver.js       # Orquestrador da cadeia de estratégias de áudio
│   │   ├── DeepInspectionStrategy.js   # Varredura recursiva de nós e strings
│   │   ├── DomMenuStrategy.js          # Varredura do menu de engrenagem no DOM
│   │   ├── EliminationStrategy.js      # Resolução reversa por exclusão de dublagens
│   │   └── MetadataStrategy.js         # Resolução via streamingData.adaptiveFormats
│   └── utils/
│       └── Logger.js                   # Utilitário central de logging e prefixos setoriais
├── manifest.json                       # Manifesto da extensão (Manifest V3)
└── README.md
```

### Detalhamento dos Pacotes

#### `src/adapters/` (Adapter Pattern)
- [`YouTubePlayerAdapter.js`](src/adapters/YouTubePlayerAdapter.js): Abstrai e padroniza as chamadas ao `#movie_player` (`getAudioTrack`, `getAvailableAudioTracks`, `setAudioTrack`, `isAdShowing`).
- [`TitleDomAdapter.js`](src/adapters/TitleDomAdapter.js): Abstrai seletores de layout e mutações no DOM do YouTube para o título do vídeo em reprodução (`h1`, `document.title` e meta tags).
- [`VideoCardDomAdapter.js`](src/adapters/VideoCardDomAdapter.js): Abstrai a identificação, extração de `videoId` e mutações visuais/acessibilidade nos cards de vídeos listados (Home, Busca, Canais e Sidebar).

#### `src/services/` (Comunicação e Integração)
- [`SettingsBridge.js`](src/services/SettingsBridge.js): Roda em `world: ISOLATED` e faz a ponte reativa entre `chrome.storage.local` e eventos do DOM.
- [`OEmbedGateway.js`](src/services/OEmbedGateway.js): Gateway Pattern que realiza chamadas assíncronas ao endpoint oEmbed com controle de timeout via `AbortController`.
- [`CachedTitleGateway.js`](src/services/CachedTitleGateway.js): Proxy Pattern (Cache Proxy) que intercepta requisições de títulos e gerencia o cache em memória (LRU simples), delegando ao `OEmbedGateway` somente em cache miss.
- [`TitleQueueService.js`](src/services/TitleQueueService.js): Producer-Consumer / Queue Pattern que gerencia o fluxo de requisições concorrentes (máximo de 3 simultâneas) com throttling de 60ms e desduplicação por `videoId` para evitar sobrecarga de rede e erros HTTP 429.

#### `src/strategies/` (Strategy Pattern)
- [`AudioTrackResolver.js`](src/strategies/AudioTrackResolver.js): Contexto do Strategy Pattern que executa a cadeia de estratégias em cascata.
- [`MetadataStrategy.js`](src/strategies/MetadataStrategy.js): Resolução via metadados de streaming DASH.
- [`DeepInspectionStrategy.js`](src/strategies/DeepInspectionStrategy.js): Busca profunda em nós internos das faixas por "original".
- [`EliminationStrategy.js`](src/strategies/EliminationStrategy.js): Identificação reversa por descarte de faixas rotuladas como dublagem.
- [`DomMenuStrategy.js`](src/strategies/DomMenuStrategy.js): Inspeciona o menu de engrenagem (`.ytp-menuitem`) do player.

#### `src/controllers/` (Facade / Orquestração)
- [`AntiDubController.js`](src/controllers/AntiDubController.js): Gerencia o ciclo de vida da SPA (`yt-navigate-finish`), eventos de vídeo, suspensão em anúncios e acionamento da troca de áudio.
- [`TitleController.js`](src/controllers/TitleController.js): Gerencia o ciclo de vida da SPA para títulos do vídeo principal, coordenando o `CachedTitleGateway` e o `TitleDomAdapter` com polling resiliente e proteção contra race conditions.
- [`ListTitleController.js`](src/controllers/ListTitleController.js): Gerencia a destradução de títulos de cards de vídeos listados, integrando `IntersectionObserver` para lazy loading (apenas cards próximos ao viewport são enfileirados) e `MutationObserver` com debounce para acompanhar scroll infinito.

#### `src/popup/` (Interface do Usuário)
- [`PopupController.js`](src/popup/PopupController.js): Gerencia as preferências do usuário no painel popup.
- [`popup.html`](src/popup/popup.html) / [`popup.css`](src/popup/popup.css): Interface visual compacta no tema escuro oficial do YouTube.

#### `src/utils/` (Utilitários Compartilhados)
- [`Logger.js`](src/utils/Logger.js): Classe utilitária central de logging que encapsula a formatação de prefixos (`[AntiDUB][Áudio]` e `[AntiDUB][Título]`), fornecendo Factory Methods (`Logger.forAudio()`, `Logger.forTitle()`) e eliminando strings hardcoded nas classes de domínio.

## Como Instalar (Modo Desenvolvedor)

1. Abra o Google Chrome e navegue até `chrome://extensions`.
2. Ative a opção **Modo do desenvolvedor** no canto superior direito.
3. Clique no botão **Carregar sem compactação** (Load unpacked).
4. Selecione esta pasta raiz do projeto (`AntiDUB_Chrome_Extension`).
